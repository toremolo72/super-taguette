import asyncio
import contextlib
import csv
import importlib_resources
import jinja2
import sqlalchemy
from markupsafe import Markup
import opentelemetry.trace
from sqlalchemy.orm import joinedload
import uuid
import xlsxwriter
from xml.sax.saxutils import XMLGenerator
from xml.sax.xmlreader import AttributesNSImpl

from . import exact_version
from . import convert
from . import database
from . import extract


tracer = opentelemetry.trace.get_tracer(__name__)


template_env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(
        [importlib_resources.files('taguette').joinpath('templates')],
    ),
    autoescape=jinja2.select_autoescape(['html']),
    extensions=['jinja2.ext.i18n'],
)


def _render_string(template_name, locale, **kwargs):
    translator = _Translator(locale)

    template = template_env.get_template(template_name)
    return template.render(
        version=exact_version(),
        gettext=translator.gettext,
        ngettext=translator.ngettext,
        pgettext=translator.pgettext,
        **kwargs,
    )


class _Translator(object):
    def __init__(self, locale):
        self.locale = locale

    def gettext(self, message, **kwargs):
        trans = self.locale.translate(message)
        if kwargs:
            trans = trans % kwargs
        return trans

    def ngettext(self, singular, plural, n, **kwargs):
        trans = self.locale.translate(singular, plural, n)
        if kwargs:
            trans = trans % kwargs
        return trans

    def pgettext(
        self,
        context, message, plural_message=None,
        n=None,
        **kwargs,
    ):
        trans = self.locale.pgettext(context, message, plural_message, n)
        if kwargs:
            trans = trans % kwargs
        return trans


def _get_highlights_for_export(db, project_id, path):
    if path:
        t_highlight = database.Highlight.__table__
        t_highlight_tag = database.highlight_tags
        t_tag = database.Tag.__table__
        t_document = database.Document.__table__
        # Join with tags a second time to find highlights that match the
        # given path, while returning all tags for those highlights
        t_highlight_tag_m = database.highlight_tags.alias()
        t_tag_m = database.Tag.__table__.alias()
        query = (
            sqlalchemy.select([
                t_highlight.c.id,
                t_highlight.c.snippet,
                t_highlight.c.memo,
                t_document.c.name,
                t_tag.c.path,
            ])
            .select_from(
                t_highlight
                .join(
                    t_highlight_tag,
                    t_highlight.c.id == t_highlight_tag.c.highlight_id,
                )
                .join(
                    t_tag,
                    t_tag.c.id == t_highlight_tag.c.tag_id,
                )
                .join(
                    t_highlight_tag_m,
                    t_highlight.c.id == t_highlight_tag_m.c.highlight_id,
                )
                .join(
                    t_tag_m,
                    t_tag_m.c.id == t_highlight_tag_m.c.tag_id,
                )
                .join(
                    t_document,
                    t_document.c.id == t_highlight.c.document_id,
                )
            )
            .where(sqlalchemy.or_(
                t_tag_m.c.path == path,
                t_tag_m.c.path.startswith(path + '.', autoescape=True),
            ))
            .where(t_document.c.project_id == project_id)
            .order_by(
                t_highlight.c.document_id,
                t_highlight.c.start_offset,
                t_highlight.c.id,
            )
        )
    else:
        # Special case to select all highlights: we also need to select
        # highlights that have no tag at all, so the startswith() condition
        # would not work
        t_highlight = database.Highlight.__table__
        t_highlight_tag = database.highlight_tags
        t_tag = database.Tag.__table__
        t_document = database.Document.__table__
        query = (
            sqlalchemy.select([
                t_highlight.c.id,
                t_highlight.c.snippet,
                t_highlight.c.memo,
                t_document.c.name,
                t_tag.c.path,
            ])
            .select_from(
                t_highlight
                .outerjoin(
                    t_highlight_tag,
                    t_highlight.c.id == t_highlight_tag.c.highlight_id,
                )
                .outerjoin(
                    t_tag,
                    t_tag.c.id == t_highlight_tag.c.tag_id,
                )
                .join(
                    t_document,
                    t_document.c.id == t_highlight.c.document_id,
                )
            )
            .where(t_document.c.project_id == project_id)
            .order_by(
                t_highlight.c.document_id,
                t_highlight.c.start_offset,
                t_highlight.c.id,
            )
        )

    highlights = []
    for row in db.execute(query).fetchall():
        highlight_id, snippet, memo, document, tag_path = row
        if highlights and highlights[-1][0] == highlight_id:
            highlights[-1][3].append(tag_path)
        else:
            highlights.append((
                highlight_id,
                snippet,
                document,
                [] if tag_path is None else [tag_path],
                memo or '',
            ))

    return highlights


def get_filename_for_highlights_export(path):
    """Get a suitable filename for exported highlights.
    """
    if path:
        return None
    else:
        return 'all_tags'


@tracer.start_as_current_span('taguette/export/highlights_csv')
def highlights_csv(db, project_id, path, file):
    """Export highlights to a CSV file.
    """
    highlights = _get_highlights_for_export(db, project_id, path)
    writer = csv.writer(file)
    writer.writerow(['id', 'document', 'tag', 'content', 'memo'])
    for id, snippet, document, tags, memo in highlights:
        if not tags:
            tags = ['']
        for tag_path in tags:
            writer.writerow([
                id, document, tag_path,
                convert.html_to_plaintext(snippet),
                memo,
            ])


@tracer.start_as_current_span('taguette/export/highlights_xlsx')
def highlights_xslx(db, project_id, path, filename):
    """Export highlights to an Excel file.
    """
    highlights = _get_highlights_for_export(db, project_id, path)

    workbook = xlsxwriter.Workbook(filename)
    sheet = workbook.add_worksheet('highlights')

    header = workbook.add_format({'bold': True})

    sheet.write(0, 0, 'id', header)
    sheet.write(0, 1, 'document', header)
    sheet.write(0, 2, 'tag', header)
    sheet.write(0, 3, 'content', header)
    sheet.write(0, 4, 'memo', header)
    sheet.set_column(0, 0, 5.0)
    sheet.set_column(1, 1, 15.0)
    sheet.set_column(2, 2, 15.0)
    sheet.set_column(3, 3, 80.0)
    sheet.set_column(4, 4, 40.0)
    row = 1
    for id, snippet, document, tags, memo in highlights:
        if not tags:
            tags = ['']
        for tag_path in tags:
            sheet.write(row, 0, str(id))
            sheet.write(row, 1, document)
            sheet.write(row, 2, tag_path)
            sheet.write(row, 3, convert.html_to_plaintext(snippet))
            sheet.write(row, 4, memo)
            row += 1
    workbook.close()


@tracer.start_as_current_span('taguette/export/highlights_doc')
def highlights_doc(db, project_id, path, ext, *, config, locale):
    """Export highlights to a text document.
    """
    highlights = _get_highlights_for_export(db, project_id, path)

    html = _render_string(
        'export_highlights.html',
        locale,
        path=path,
        highlights=highlights,
    )

    mimetype, contents = convert.html_to(html, ext, config)
    return mimetype, contents


@tracer.start_as_current_span('taguette/export/highlighted_document')
async def highlighted_document(db, document, ext, *, config, locale):
    """Export a document annotated with highlights.

    Each highlight is followed by its tags in brackets.
    """
    highlights = (
        db.query(database.Highlight)
        .filter(database.Highlight.document_id == document.id)
        .order_by(database.Highlight.start_offset)
        .options(joinedload(database.Highlight.tags))
    ).all()

    highlights = [
        (hl.start_offset, hl.end_offset, [t.path for t in hl.tags])
        for hl in highlights
    ]

    html = await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: extract.highlight(
            document.contents, highlights,
            show_tags=True,
        ),
    )

    html = _render_string(
        'export_document.html',
        locale,
        name=document.name,
        contents=Markup(html),
    )

    mimetype, contents = convert.html_to(
        html, ext,
        config,
    )
    contents = await contents
    return mimetype, contents


TAGUETTE_NAMESPACE = uuid.UUID('51B2B2B7-27EB-4ECB-9D56-E75B0A0496C2')


@tracer.start_as_current_span('taguette/export/codebook_xml')
def codebook_xml(tags, file):
    """Export a codebook in REFI-QDA format for the given tags.
    """
    with contextlib.ExitStack() as stack:
        if not hasattr(file, 'write'):
            file = stack.enter_context(open(file, 'wb'))

        # http://schema.qdasoftware.org/versions/Codebook/v1.0/Codebook.xsd
        output = XMLGenerator(
            file,
            encoding='utf-8',
            short_empty_elements=True,
        )
        output.startDocument()
        output.startPrefixMapping(None, 'urn:QDA-XML:codebook:1.0')
        output.startElementNS(
            (None, 'CodeBook'), 'CodeBook',
            AttributesNSImpl(
                {(None, 'origin'): 'Taguette %s' % exact_version()},
                {(None, 'origin'): 'origin'},
            ),
        )
        output.startElementNS(
            (None, 'Codes'), 'Codes',
            AttributesNSImpl({}, {}),
        )
        for tag in tags:
            guid = uuid.uuid5(TAGUETTE_NAMESPACE, tag.path)
            guid = str(guid).upper()
            attrs = {(None, 'guid'): guid,
                     (None, 'name'): tag.path,
                     (None, 'isCodable'): 'false' if tag.is_folder else 'true'}
            qnames = {(None, 'guid'): 'guid',
                      (None, 'name'): 'name',
                      (None, 'isCodable'): 'isCodable'}
            if tag.color:
                attrs[(None, 'color')] = tag.color
                qnames[(None, 'color')] = 'color'
            output.startElementNS(
                (None, 'Code'), 'Code',
                AttributesNSImpl(attrs, qnames),
            )
            output.endElementNS((None, 'Code'), 'Code')
        output.endElementNS((None, 'Codes'), 'Codes')
        output.startElementNS(
            (None, 'Sets'), 'Sets',
            AttributesNSImpl({}, {}),
        )
        output.endElementNS((None, 'Sets'), 'Sets')
        output.endElementNS((None, 'CodeBook'), 'CodeBook')
        output.endPrefixMapping(None)
        output.endDocument()


@tracer.start_as_current_span('taguette/export/codebook_csv')
def codebook_csv(tags, file):
    """Export a codebook in CSV format for the given tags.
    """
    with contextlib.ExitStack() as stack:
        if not hasattr(file, 'write'):
            file = stack.enter_context(open(file, 'w'))

        writer = csv.writer(file)
        writer.writerow([
            'tag',
            'description',
            'color',
            'number of highlights',
            'number of documents',
        ])
        for tag in tags:
            writer.writerow([
                tag.path,
                tag.description,
                tag.color or '',
                tag.highlights_count,
                tag.documents_count,
            ])


@tracer.start_as_current_span('taguette/export/codebook_xlsx')
def codebook_xlsx(tags, filename):
    """Export a codebook in Excel format for the given tags.
    """
    workbook = xlsxwriter.Workbook(filename)
    sheet = workbook.add_worksheet('codebook')

    header = workbook.add_format({'bold': True})

    sheet.write(0, 0, 'tag', header)
    sheet.write(0, 1, 'description', header)
    sheet.write(0, 2, 'color', header)
    sheet.write(0, 3, 'number of highlights', header)
    sheet.write(0, 4, 'number of documents', header)
    sheet.set_column(0, 0, 30.0)
    sheet.set_column(1, 1, 80.0)
    for row, tag in enumerate(tags, start=1):
        sheet.write(row, 0, tag.path)
        sheet.write(row, 1, tag.description)
        sheet.write(row, 2, tag.color or '')
        sheet.write(row, 3, tag.highlights_count)
        sheet.write(row, 4, tag.documents_count)
    workbook.close()


@tracer.start_as_current_span('taguette/export/codebook_document')
async def codebook_document(tags, ext, *, config, locale):
    """Export a codebook as a text document for the given tags.
    """
    html = _render_string(
        'export_codebook.html',
        locale,
        tags=tags,
    )

    mimetype, contents = convert.html_to(
        html, ext,
        config,
    )
    contents = await contents
    return mimetype, contents


# ---------------------------------------------------------------------------
# Thematic-analysis report: themes (folders) -> codes -> extracts, plus memos


def _report_data(db, project):
    """Collect everything the report needs, as plain dicts."""
    tags = sorted(project.tags, key=lambda t: t.path)
    by_path = {t.path: t for t in tags}

    # Highlights with their tags and document, in document order
    t_hl = database.Highlight
    rows = (
        db.query(t_hl, database.Document.name)
        .join(database.Document, database.Document.id == t_hl.document_id)
        .filter(database.Document.project_id == project.id)
        .order_by(database.Document.name, t_hl.document_id, t_hl.start_offset)
        .all()
    )
    extracts_by_tag = {}
    notes = []  # highlights without tags: sticky notes
    for hl, doc_name in rows:
        item = {
            'id': hl.id,
            'document': doc_name,
            'text': convert.html_to_plaintext(hl.snippet),
            'memo': hl.memo or '',
        }
        if hl.tags:
            for t in hl.tags:
                extracts_by_tag.setdefault(t.id, []).append(item)
        else:
            notes.append(item)

    def node(tag):
        children = [
            node(c) for c in tags
            if c.path.startswith(tag.path + '.')
            and '.' not in c.path[len(tag.path) + 1:]
        ]
        return {
            'id': tag.id,
            'name': tag.path.rsplit('.', 1)[-1],
            'path': tag.path,
            'description': tag.description or '',
            'color': tag.color,
            'is_folder': bool(tag.is_folder),
            'count': tag.highlights_count,
            'extracts': extracts_by_tag.get(tag.id, []),
            'children': children,
        }

    top = [node(t) for t in tags if '.' not in t.path]
    documents = [
        {'name': d.name, 'description': d.description or '', 'memo': d.memo or ''}
        for d in sorted(project.documents, key=lambda d: d.name)
    ]
    return {
        'project': project,
        'journal': project.journal or '',
        'documents': documents,
        'themes': top,
        'notes': notes,
        'total_highlights': sum(len(v) for v in extracts_by_tag.values()),
    }


@tracer.start_as_current_span('taguette/export/report_document')
async def report_document(db, project, ext, *, config, locale):
    """Export the analysis report as HTML (or DOCX/PDF via Calibre)."""
    data = _report_data(db, project)
    html = _render_string('export_report.html', locale, **data)
    mimetype, contents = convert.html_to(html, ext, config)
    contents = await contents
    return mimetype, contents


def report_markdown(db, project, locale):
    """Export the analysis report as Markdown."""
    data = _report_data(db, project)
    tr = _Translator(locale)
    out = []
    w = out.append
    w('# %s\n' % project.name)
    if project.description:
        w(project.description.strip() + '\n')
    w('')
    if data['journal']:
        w('## %s\n' % tr.pgettext('report heading', 'Analytic journal'))
        w(data['journal'].strip() + '\n')
    w('## %s\n' % tr.pgettext('report heading', 'Data'))
    for d in data['documents']:
        w('### %s\n' % d['name'])
        if d['description']:
            w(d['description'].strip() + '\n')
        if d['memo']:
            w('> ' + d['memo'].strip().replace('\n', '\n> ') + '\n')
    w('## %s\n' % tr.pgettext('report heading', 'Themes and codes'))

    def write_node(n, level):
        heading = '#' * min(level, 6)
        label = n['name']
        if not n['is_folder']:
            label += ' (%d)' % n['count']
        w('%s %s\n' % (heading, label))
        if n['description']:
            w(n['description'].strip() + '\n')
        for ex in n['extracts']:
            w('> %s\n>\n> — *%s*%s\n' % (
                ex['text'].replace('\n', ' '),
                ex['document'],
                ('  \n> %s: %s' % (tr.pgettext('report', 'Memo'), ex['memo'])) if ex['memo'] else '',
            ))
        for c in n['children']:
            write_node(c, level + 1)

    for n in data['themes']:
        write_node(n, 3)
    if data['notes']:
        w('## %s\n' % tr.pgettext('report heading', 'Notes (uncoded)'))
        for ex in data['notes']:
            w('- **%s** — %s  \n  %s' % (ex['document'], ex['memo'], ex['text'].replace('\n', ' ')))
        w('')
    return '\n'.join(out)
