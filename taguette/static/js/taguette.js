/*
 * Table of contents
 *
 * - Utilities
 * - Selection stuff
 * - Project metadata
 * - Documents list
 * - Add document
 * - Tags list
 * - Highlights
 * - Add highlight
 * - Members
 * - Load contents
 * - Long polling
 */


/*
 * Utilities
 */

if(!Object.entries) {
  Object.entries = function(obj) {
    var ownProps = Object.keys(obj),
      i = ownProps.length,
      resArray = new Array(i); // preallocate the Array
    while(i--) {
      resArray[i] = [ownProps[i], obj[ownProps[i]]];
    }

    return resArray;
  };
}

function sortByKey(array, key, reverse) {
  var orderByX = 1;
  if(reverse){
    orderByX = -1
  }
  array.sort(function(a, b) {
    if(key(a) < key(b)) {
      return -1 * orderByX;
    } else if(key(a) > key(b)) {
      return 1 * orderByX;
    } else {
      return 0;
    }
  });
}

function encodeGetParams(params) {
  return Object.entries(params)
    .filter(function(kv) { return kv[1] !== undefined; })
    .map(function(kv) { return kv.map(encodeURIComponent).join("="); })
    .join("&");
}

// Don't use RegExp literals https://github.com/python-babel/babel/issues/640
var _escapeA = new RegExp('&', 'g'),
    _escapeL = new RegExp('<', 'g'),
    _escapeG = new RegExp('>', 'g'),
    _escapeQ = new RegExp('"', 'g'),
    _escapeP = new RegExp("'", 'g');
function escapeHtml(s) {
  return s
    .replace(_escapeA, "&amp;")
    .replace(_escapeL, "&lt;")
    .replace(_escapeG, "&gt;")
    .replace(_escapeQ, "&quot;")
    .replace(_escapeP, "&#039;");
}

function nextElement(node) {
  while(node && !node.nextSibling) {
    node = node.parentNode;
  }
  if(!node) {
    return null;
  }
  node = node.nextSibling;
  while(node.firstChild) {
    node = node.firstChild;
  }
  return node;
}

var onlyWhitespace = new RegExp('^[\r\n\t]*$');

function getScrollPos() {
  var doc = document.scrollingElement || document.documentElement, body = document.body;
  var x = (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc.clientLeft || 0);
  var y = (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc.clientTop || 0);
  return {x: x, y: y};
}

function getCookie(name) {
  var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
  return r ? r[1] : undefined;
}

function ApiError(response, message) {
  if(!message) {
    message = "Status " + response.status;
  }
  this.status = response.status;
  this.message = message;
}
ApiError.prototype.toString = function() {
  return this.message;
};

function getJSON(url='', args) {
  if(args) {
    args = '?' + encodeGetParams(args);
  } else {
    args = '';
  }
  return fetch(
    base_path + url + args,
    {
      credentials: 'same-origin',
      mode: 'same-origin',
      redirect: 'error'
    }
  ).then(function(response) {
    if(response.status != 200) {
      return response.json()
      .then(
      function(json) {
        if("error" in json) {
          throw new ApiError(response, json.error);
        } else {
          throw new ApiError(response);
        }
      },
      function() {
        throw new ApiError(response);
      }
      );
    }
    return response.json().catch(function() { throw new ApiError(response, "Invalid JSON"); });
  });
}

function deleteURL(url='', args) {
  if(args) {
    args = encodeGetParams(args);
  } else {
    args = '';
  }
  var xsrf = getCookie('_xsrf');
  return fetch(
    base_path + url + '?' + (xsrf !== undefined ? '_xsrf=' + encodeURIComponent(xsrf) + '&' : '') + args,
    {
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-cache',
      redirect: 'error',
      method: 'DELETE'
    }
  ).then(function(response) {
    if(response.status != 204) {
      throw new ApiError(response);
    }
  });
}

function postJSON(url='', data={}, args) {
  if(args) {
    args = encodeGetParams(args);
  } else {
    args = '';
  }
  var xsrf = getCookie('_xsrf');
  return fetch(
    base_path + url + '?' + (xsrf !== undefined ? '_xsrf=' + encodeURIComponent(xsrf) + '&' : '') + args,
    {
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-cache',
      redirect: 'error',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(data)
    }
  ).then(function(response) {
    if(response.status != 200) {
      return response.json()
      .then(
      function(json) {
        if("error" in json) {
          throw new ApiError(response, json.error);
        } else {
          throw new ApiError(response);
        }
      },
      function() {
        throw new ApiError(response);
      }
      );
    }
    return response.json().catch(function() { throw new ApiError(response, "Invalid JSON"); });
  });
}

function patchJSON(url='', data={}, args) {
  if(args) {
    args = encodeGetParams(args);
  } else {
    args = '';
  }
  var xsrf = getCookie('_xsrf');
  return fetch(
    base_path + url + '?' + (xsrf !== undefined ? '_xsrf=' + encodeURIComponent(xsrf) + '&' : '') + args,
    {
      credentials: 'same-origin',
      mode: 'same-origin',
      cache: 'no-cache',
      redirect: 'error',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(data)
    }
  ).then(function(response) {
    if(response.status != 204) {
      return response.json()
      .then(
      function(json) {
        if("error" in json) {
          throw new ApiError(response, json.error);
        } else {
          throw new ApiError(response);
        }
      },
      function() {
        throw new ApiError(response);
      }
      );
    } else {
      return null;
    }
  });
}

// Returns the byte length of a string encoded in UTF-8
// https://stackoverflow.com/q/5515869/711380
if(window.TextEncoder) {
  function lengthUTF8(s) {
    return (new TextEncoder('utf-8').encode(s)).length;
  }
} else {
  function lengthUTF8(s) {
    var l = s.length;
    for(var i = s.length - 1; i >= 0; --i) {
      var code = s.charCodeAt(i);
      if(code > 0x7f && code <= 0x7ff) ++l;
      else if(code > 0x7ff && code <= 0xffff) l += 2;
      if (code >= 0xDC00 && code <= 0xDFFF) i--; // trailing surrogate
    }
    return l;
  }
}

// Escape a string for use in a regexp
// https://stackoverflow.com/a/6969486/711380
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

window.addEventListener('load', function() {
  // https://css-tricks.com/snippets/jquery/draggable-without-jquery-ui/
  (function($) {
    $.fn.drags = function(opt) {
      opt = $.extend({handle:"",cursor:"move"}, opt);
      if(opt.handle === "") {
          var $el = this;
      } else {
          var $el = this.find(opt.handle);
      }

      return $el.css('cursor', opt.cursor).on("mousedown", function(e) {
        if(opt.handle === "") {
          var $drag = $(this).addClass('draggable');
        } else {
          var $drag = $(this).addClass('active-handle').parent().addClass('draggable');
        }
        var z_idx = $drag.css('z-index'),
            drg_h = $drag.outerHeight(),
            drg_w = $drag.outerWidth(),
            pos_y = $drag.offset().top + drg_h - e.pageY,
            pos_x = $drag.offset().left + drg_w - e.pageX;
        $drag.css('z-index', 1000).parents().on("mousemove", function(e) {
          $('.draggable').offset({
            top:e.pageY + pos_y - drg_h,
            left:e.pageX + pos_x - drg_w
          }).on("mouseup", function() {
            $(this).removeClass('draggable').css('z-index', z_idx);
          });
        });
        e.preventDefault(); // disable selection
      }).on("mouseup", function() {
        if(opt.handle === "") {
          $(this).removeClass('draggable');
        } else {
          $(this).removeClass('active-handle').parent().removeClass('draggable');
        }
      });
    }
  })(jQuery);
});

function showSpinner() {
  $('#spinner-modal').modal('show');
}

function hideSpinner() {
  $('#spinner-modal').modal('hide');
}


/*
 * Selection stuff
 */

var chunk_offsets = [];

// Get the document offset from a position
function describePos(node, offset) {
  // Convert current offset from character to bytes
  offset = lengthUTF8(node.textContent.substring(0, offset));
  while(!node.id) {
    if(node.previousSibling) {
      node = node.previousSibling;
      offset += lengthUTF8(node.textContent);
    } else {
      node = node.parentNode;
    }
  }
  if(node.id.substring(0, 11) != 'doc-offset-') {
    return null;
  }
  return parseInt(node.id.substring(11)) + offset;
}

// Find a position from the document offset
function locatePos(pos) {
  // Find the right chunk
  var chunk_start = 0;
  for(var i = 0; i < chunk_offsets.length; ++i) {
    if(chunk_offsets[i] > pos) {
      break;
    }
    chunk_start = chunk_offsets[i];
  }

  var offset = pos - chunk_start;
  var node = document.getElementById('doc-offset-' + chunk_start);
  while(node.firstChild) {
    node = node.firstChild;
  }
  while(offset > 0) {
    if(lengthUTF8(node.textContent) >= offset) {
      break;
    } else {
      offset -= lengthUTF8(node.textContent);
      node = nextElement(node);
    }
  }
  return [node, offset]
}

var current_selection = null;

// Describe the selection e.g. [14, 56]
function describeSelection() {
  var sel = window.getSelection();
  if(sel.rangeCount != 0) {
    var range = sel.getRangeAt(0);
    if(!range.collapsed) {
      var start = describePos(range.startContainer, range.startOffset);
      var end = describePos(range.endContainer, range.endOffset);
      if(start !== null && end !== null) {
        return [start, end];
      }
    }
  }
  return null;
}

// Restore a described selection
function restoreSelection(saved) {
  var sel = window.getSelection();
  sel.removeAllRanges();
  if(saved !== null) {
    var range = document.createRange();
    var start = locatePos(saved[0]);
    var end = locatePos(saved[1]);
    range.setStart(start[0], start[1]);
    range.setEnd(end[0], end[1]);
    sel.addRange(range);
  }
}

function splitAtPos(pos, after) {
  var node = pos[0], idx = pos[1];
  if(idx === 0) {
    // Leftmost index: return current node
    return node;
  } else if(idx >= lengthUTF8(node.textContent)) {
    // Rightmost index: return next node
    return nextElement(node);
  } else {
    // Find the character index from the byte index
    var idx_char = 0;
    while(idx > 0) {
      var code = node.textContent.charCodeAt(idx_char);
      if(code <= 0x7f) idx -= 1;
      else if(code <= 0x7ff) idx -= 2;
      else if(code <= 0xffff) idx -= 3;
      else idx -= 4;
      idx_char += 1;
    }
    if(idx_char >= node.textContent.length) {
      console.error("Error computing character position!");
      idx_char = node.textContent.length - 1;
    }
    // Split, return right node
    return node.splitText(idx_char);
  }
}

// Highlight a described selection
// Palette offered in the tag editor: comes from the current theme's CSS
function themeTagPalette() {
  var raw = getComputedStyle(document.documentElement).getPropertyValue('--tag-palette');
  var colors = raw.split(',').map(function(c) { return c.trim().toLowerCase(); })
    .filter(function(c) { return /^#[0-9a-f]{6}$/.test(c); });
  if(colors.length === 0) {
    colors = ['#eeaabe', '#e4846f', '#e7d59a', '#98c4ba', '#82b4e3', '#b4addf', '#cfc9f4', '#e4bcbf'];
  }
  return colors;
}
var TAG_PALETTE = themeTagPalette();

// Current theme's accent color (used for the not-yet-saved highlight)
function themeAccent(alpha) {
  var c = getComputedStyle(document.documentElement).getPropertyValue('--se-lavender').trim();
  if(/^#[0-9a-fA-F]{6}$/.test(c)) {
    return hexToRgba(c, alpha);
  }
  return 'rgba(180, 173, 223, ' + alpha + ')';
}

// "a.b.c" -> '<span class="tag-parent">a › b › </span>c' (or just "c" when full=false)
function tagPathHtml(path, full) {
  var parent = tagParentPath(path);
  var leaf = tagLeafName(path);
  if(!parent || !full) {
    return escapeHtml(leaf);
  }
  return '<span class="tag-parent">' + escapeHtml(parent.split(TAG_SEP).join(' \u203a ')) + ' \u203a </span>' + escapeHtml(leaf);
}

function hexToRgba(hex, alpha) {
  var r = parseInt(hex.substring(1, 3), 16);
  var g = parseInt(hex.substring(3, 5), 16);
  var b = parseInt(hex.substring(5, 7), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

// Automatic color for a tag without one (golden-angle hue spacing)
function autoTagColor(tag_id, alpha) {
  var hue = (tag_id * 137.508) % 360;
  return 'hsla(' + hue.toFixed(1) + ', 60%, 70%, ' + alpha + ')';
}

/*
 * Tag hierarchy helpers. Tags are hierarchical through their path:
 * "interview.positive" is a child of "interview".
 */
var TAG_SEP = '.';

function tagParentPath(path) {
  var i = path.lastIndexOf(TAG_SEP);
  return i === -1 ? '' : path.substring(0, i);
}
function tagLeafName(path) {
  var i = path.lastIndexOf(TAG_SEP);
  return i === -1 ? path : path.substring(i + 1);
}
function tagDepth(path) {
  return path.split(TAG_SEP).length - 1;
}
function tagByPath(path) {
  var entries = Object.values(tags);
  for(var i = 0; i < entries.length; ++i) {
    if(entries[i].path === path) return entries[i];
  }
  return null;
}
function tagIsDescendant(path, ancestor_path) {
  return path.indexOf(ancestor_path + TAG_SEP) === 0;
}
// Nearest ancestor (or the tag itself) that has an explicit color
function tagEffectiveColorSource(tag) {
  var path = tag.path;
  var t = tag;
  while(true) {
    if(t && t.color) return t;
    if(!path) return null;
    path = tagParentPath(path);
    t = path ? tagByPath(path) : null;
  }
}

// Color of a tag: its own, else inherited from a parent, else automatic
function tagColor(tag_id, alpha) {
  if(tag_id === null || tag_id === undefined) {
    return 'rgba(170, 170, 180, ' + alpha + ')';
  }
  var tag = tags['' + tag_id];
  if(tag) {
    var src = tagEffectiveColorSource(tag);
    if(src) {
      return hexToRgba(src.color, alpha);
    }
  }
  return autoTagColor(tag_id, alpha);
}

// Highlight a described selection
function highlightSelection(saved, id, clickedCallback, title, color) {
  console.log("Highlighting", saved);
  if(saved === null) {
    return;
  }
  var start = locatePos(saved[0]);
  start = splitAtPos(start, false);
  var end = locatePos(saved[1]);
  end = splitAtPos(end, true);

  var node = start;
  var last_span = null;
  while(node != end) {
    var next = nextElement(node);
    if(node.nodeType == 3 // TEXT_NODE
     && node.textContent
     && !node.textContent.match(onlyWhitespace)) {
      var span = document.createElement('a');
      span.className = 'highlight highlight-' + id;
      span.setAttribute('data-highlight-id', '' + id);
      span.setAttribute('title', title);
      if(color) {
        span.style.backgroundColor = color;
      }
      span.addEventListener('click', clickedCallback);
      node.parentNode.insertBefore(span, node);
      span.appendChild(node);
      last_span = span;
    }
    node = next;
  }
  if(last_span !== null) {
    last_span.classList.add('highlight-end');
  }
  return last_span;
}


/*
 * Project metadata
 */

var project_name_input = document.getElementById('project-name');
var project_name = project_name_input.value;

var project_description_input = document.getElementById('project-description');
var project_description = project_description_input.value;

function setProjectMetadata(metadata, form=true) {
  if(project_name == metadata.project_name
   && project_description == metadata.description) {
    return;
  }
  // Update globals
  project_name = metadata.project_name;
  project_description = metadata.description;
  // Update form
  if(form) {
    project_name_input.value = project_name;
    project_description_input.value = project_description;
  }
  // Update elements
  var elems = document.getElementsByClassName('project-name');
  for(var i = 0; i < elems.length; ++i) {
    elems[i].textContent = project_name;
  }
  console.log("Project metadata updated");
}

function projectMetadataChanged() {
  if(project_name_input.value != project_name
   || project_description_input.value != project_description) {
    console.log("Posting project metadata update");
    var meta = {
      name: project_name_input.value,
      description: project_description_input.value
    };
    postJSON(
      '/api/project/' + project_id,
      meta
    )
    .then(function() {
      setProjectMetadata(meta, false);
    })
    .catch(function(error) {
      console.error("Failed to update project metadata:", error);
      alert(gettext("Couldn't update project metadata!") + "\n\n" + error);
      project_name_input.value = project_name;
      project_description_input.value = project_description;
    });
  }
}

document.getElementById('project-metadata-form').addEventListener('submit', function(e) {
  e.preventDefault();
  projectMetadataChanged();
});
project_name_input.addEventListener('blur', projectMetadataChanged);
project_description_input.addEventListener('blur', projectMetadataChanged);


/*
 * Documents list
 */

var current_document = null;
var current_tag = null;
var last_added_tag = null;
var documents_list = document.getElementById('documents-list');

function linkDocument(elem, doc_id) {
  var url = base_path + '/project/' + project_id + '/document/' + doc_id;
  elem.setAttribute('href', url);
  elem.addEventListener('click', function(e) {
    e.preventDefault();
    window.history.pushState({document_id: doc_id}, "Document " + doc_id, url);
    loadDocument(doc_id);
  });
}

function updateDocumentsList() {
  // Empty the list
  while(documents_list.firstChild) {
    var first = documents_list.firstChild;
    if(first.classList
     && first.classList.contains('special-item-button')) {
      break;
    }
    documents_list.removeChild(first);
  }

  // Fill up the list again
  var before = documents_list.firstChild;
  var entries = Object.entries(documents);
  sortByKey(entries, function(e) { return e[1].name; });
  for(var i = 0; i < entries.length; ++i) {
    var doc = entries[i][1];
    var elem = document.createElement('li');
    elem.setAttribute('id', 'document-link-' + doc.id);
    elem.className = 'list-group-item document-link';
    if(doc.id === current_document) {
      elem.classList.add('document-link-current');
    }
    elem.innerHTML =
      '<div class="d-flex justify-content-between align-items-center">' +
      '  <a class="document-link-a">' + escapeHtml(doc.name) + '</a>' +
      '  <a href="javascript:editDocument(' + doc.id + ');" class="btn btn-primary btn-sm">' + gettext("Edit") + '</a>' +
      '</div>';
    documents_list.insertBefore(elem, before);
    var links = elem.getElementsByTagName('a');
    linkDocument(links[0], doc.id);
  }
  if(entries.length == 0) {
    var elem = document.createElement('div');
    elem.className = 'list-group-item disabled';
    elem.textContent = gettext("There are no documents in this project yet.");
    documents_list.insertBefore(elem, before);
  }
  console.log("Documents list updated");
}

updateDocumentsList();

function addDocument(document) {
  documents['' + document.id] = document;
  if(document.id === current_document) {
    // Text direction is the only meaningful thing that can be mutated
    if(document.text_direction === 'RIGHT_TO_LEFT') {
      document_contents.style.direction = 'rtl';
    } else {
      document_contents.style.direction = 'ltr';
    }
  }
  updateDocumentsList();
}

function removeDocument(document_id) {
  delete documents['' + document_id];
  updateDocumentsList();
  if(current_document == document_id) {
    window.history.pushState({}, "Project", base_path + '/project/' + project_id);
    loadDocument(null);
  }
}


/*
 * Add document
 */

var document_add_modal = document.getElementById('document-add-modal');

function createDocument() {
  document.getElementById('document-add-form').reset();
  $(document_add_modal).modal();
}

function basename(filename) {
  if(filename) {
    var idx = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
    if(idx > -1) {
      filename = filename.substring(idx + 1);
    }
  }
  return filename;
}

document.getElementById('document-add-form').addEventListener('submit', function(e) {
  e.preventDefault();
  console.log("Uploading document...");

  var form_data = new FormData();
  var name = document.getElementById('document-add-name').value;
  if(!name) {
    name = basename(document.getElementById('document-add-file').value);
    name = name.substring(0, 50);
  }
  form_data.append('name', name);
  form_data.append('description',
                   document.getElementById('document-add-description').value);
  form_data.append('file',
                   document.getElementById('document-add-file').files[0]);
  form_data.append('text_direction',
                   document.getElementById('document-add-form').elements['document-add-direction'].value);
  form_data.append('_xsrf', getCookie('_xsrf'));

  var xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  xhr.open('POST', base_path + '/api/project/' + project_id + '/document/new');
  showSpinner();
  xhr.onload = function() {
    if(xhr.status == 200) {
      $(document_add_modal).modal('hide');
      document.getElementById('document-add-form').reset();
      console.log("Document upload complete");
      var doc_id = xhr.response.created;
      var url = base_path + '/project/' + project_id + '/document/' + doc_id;
      window.history.pushState({document_id: doc_id}, "Document " + doc_id, url);
      loadDocument(doc_id);
    } else {
      console.error("Document upload failed: status", xhr.status);
      var error = null;
      try {
        error = xhr.response.error;
      } catch(e) {
      }
      if(!error) {
        error = "Status " + xhr.status;
      }
      alert(gettext("Error uploading file!") + "\n\n" + error);
    }
    hideSpinner();
  };
  xhr.onerror = function(e) {
    console.log("Document upload failed:", e);
    alert(gettext("Error uploading file!"));
    hideSpinner();
  }
  xhr.send(form_data);
});


/*
 * Change document
 */

var document_change_modal = document.getElementById('document-change-modal');

function editDocument(doc_id) {
  document.getElementById('document-change-form').reset();
  document.getElementById('document-change-id').value = '' + doc_id;
  document.getElementById('document-change-name').value = '' + documents['' + doc_id].name;
  document.getElementById('document-change-description').value = '' + documents['' + doc_id].description;
  document.getElementById('document-change-form').elements['document-change-direction'].value = documents['' + doc_id].text_direction;
  $(document_change_modal).modal();
}

document.getElementById('document-change-form').addEventListener('submit', function(e) {
  e.preventDefault();
  console.log("Changing document...");

  var update = {
    name: document.getElementById('document-change-name').value,
    description: document.getElementById('document-change-description').value,
    text_direction: document.getElementById('document-change-form').elements['document-change-direction'].value
  };
  if(!update.name || update.name.length == 0) {
    alert(gettext("Document name cannot be empty"));
    return;
  }

  var doc_id = document.getElementById('document-change-id').value;
  showSpinner();
  postJSON(
    '/api/project/' + project_id + '/document/' + doc_id,
    update
  )
  .then(function() {
    console.log("Document update posted");
    $(document_change_modal).modal('hide');
    document.getElementById('document-change-form').reset();
  })
  .catch(function(error) {
    console.error("Failed to update document:", error);
    alert(gettext("Couldn't update document!") + "\n\n" + error);
  })
  .then(hideSpinner);
});

document.getElementById('document-change-delete').addEventListener('click', function(e) {
  e.preventDefault();

  var doc_id = document.getElementById('document-change-id').value;
  if(!window.confirm(gettext("Are you sure you want to delete the document '%(doc)s'?", {doc: documents[doc_id].name}))) {
    return;
  }
  console.log("Deleting document " + doc_id + "...");
  deleteURL('/api/project/' + project_id + '/document/' + doc_id)
  .then(function() {
    console.log("Document deletion posted");
    $(document_change_modal).modal('hide');
    document.getElementById('document-change-form').reset();
  })
  .catch(function(error) {
    console.error("Failed to delete document:", error);
    alert(gettext("Couldn't delete document!") + "\n\n" + error);
  });
});


/*
 * Tags list
 */

var tags_sorter = document.getElementById('tag-sortby');
var sortTags = ['path', 'asc'];
var tags_list = document.getElementById('tags-list');
var tags_modal_list = document.getElementById('highlight-add-tags');

function sortTagsBy(field, dir) {
  sortTags = [field, dir];
  var options = document.getElementById('tag-sortby-menu').querySelectorAll('a.dropdown-item');
  var optionSorts = [
    ['path', 'asc'],
    ['path', 'desc'],
    ['count', 'asc'],
    ['count', 'desc'],
  ];
  for(var i = 0; i < optionSorts.length; ++i) {
    if(optionSorts[i][0] === field && optionSorts[i][1] === dir) {
      options[i].classList.add('active');
    } else {
      options[i].classList.remove('active');
    }
  }
  updateTagsList();
}

function linkTag(elem, tag_path) {
  var url = base_path + '/project/' + project_id + '/highlights/' + encodeURIComponent(tag_path);
  elem.setAttribute('href', url);
  elem.addEventListener('click', function(e) {
    e.preventDefault();
    window.history.pushState({tag_path: tag_path}, "Tag " + tag_path, url);
    loadTag(tag_path);
  });
}

linkTag(document.getElementById('load-all-tags'), '');

function addTag(tag) {
  if(!('count' in tag) && tag.id in tags) {
    tag.count = tags[tag.id].count;
  } else if(!('count' in tag)) {
    tag = Object.assign({'count': 0}, tag)
  }
  tags[tag.id] = tag;
  updateTagsList();

  // This is the last tag we created, check it
  if(tag.id == last_added_tag && !tag.is_folder){
    var cb = document.getElementById('highlight-add-tags-' + tag.id);
    if(cb) cb.checked = true;
  }
}

function removeTag(tag_id) {
  // Remove from list of tags
  delete tags['' + tag_id];
  // Remove from all highlights
  var hl_entries = Object.entries(highlights);
  for(var i = 0; i < hl_entries.length; ++i) {
    var hl = hl_entries[i][1];
    hl.tags = hl.tags.filter(function(v) { return v != tag_id; });
  }
  updateTagsList();
}

function mergeTags(tag_src, tag_dest) {
  for(var id in highlights) {
    var hl_tags = highlights[id].tags;

    if(hl_tags.includes(tag_src)) {
      // Remove src tag
      var idx = hl_tags.indexOf(tag_src);
      hl_tags.splice(idx, 1);

      if(!hl_tags.includes(tag_dest)) {
        // Add new tag
        hl_tags.push(tag_dest);
      }
    }
  }
  delete tags['' + tag_src];
  updateTagsList();
}

// Collapsed state of the tag tree, remembered per project
var tag_tree_collapsed = {};
try {
  tag_tree_collapsed = JSON.parse(localStorage.getItem('taguette-tagtree-' + project_id) || '{}');
} catch(e) { tag_tree_collapsed = {}; }
function saveTagTreeState() {
  try {
    localStorage.setItem('taguette-tagtree-' + project_id, JSON.stringify(tag_tree_collapsed));
  } catch(e) {}
}

// Move a tag (and its sub-tags) under a new parent path ('' = top level)
function moveTag(tag, new_parent_path) {
  var new_path = new_parent_path ? new_parent_path + TAG_SEP + tagLeafName(tag.path) : tagLeafName(tag.path);
  if(new_path === tag.path) return;
  if(new_parent_path === tag.path || tagIsDescendant(new_parent_path, tag.path)) {
    return;  // can't move under itself
  }
  if(tagByPath(new_path)) {
    alert(gettext("A tag named '%(tag)s' already exists there", {tag: new_path}));
    return;
  }
  showSpinner();
  postJSON('/api/project/' + project_id + '/tag/' + tag.id, {path: new_path})
  .catch(function(error) {
    console.error("Failed to move tag:", error);
    alert(gettext("Couldn't move tag!") + "\n\n" + error);
  })
  .then(hideSpinner);
}

var dragged_tag_id = null;

function setupTagDrag(elem, tag) {
  if(tag) {
    elem.setAttribute('draggable', 'true');
    elem.addEventListener('dragstart', function(e) {
      dragged_tag_id = tag.id;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', tag.path); } catch(err) {}
      elem.classList.add('tag-dragging');
      document.getElementById('tag-drop-top').classList.add('visible');
    });
    elem.addEventListener('dragend', function() {
      dragged_tag_id = null;
      elem.classList.remove('tag-dragging');
      document.getElementById('tag-drop-top').classList.remove('visible');
      var over = document.getElementsByClassName('tag-dragover');
      while(over.length) over[0].classList.remove('tag-dragover');
    });
  }
  // Any row (real or virtual) can be a drop target
  elem.addEventListener('dragover', function(e) {
    if(dragged_tag_id === null) return;
    var target_path = elem.getAttribute('data-tag-path');
    var src = tags['' + dragged_tag_id];
    if(!src || target_path === src.path || tagIsDescendant(target_path, src.path)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    elem.classList.add('tag-dragover');
  });
  elem.addEventListener('dragleave', function() {
    elem.classList.remove('tag-dragover');
  });
  elem.addEventListener('drop', function(e) {
    if(dragged_tag_id === null) return;
    e.preventDefault();
    elem.classList.remove('tag-dragover');
    var src = tags['' + dragged_tag_id];
    if(src) moveTag(src, elem.getAttribute('data-tag-path'));
  });
}

// Drop zone to move a tag back to the top level
(function() {
  var zone = document.getElementById('tag-drop-top');
  zone.addEventListener('dragover', function(e) {
    if(dragged_tag_id === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('tag-dragover');
  });
  zone.addEventListener('dragleave', function() { zone.classList.remove('tag-dragover'); });
  zone.addEventListener('drop', function(e) {
    if(dragged_tag_id === null) return;
    e.preventDefault();
    zone.classList.remove('tag-dragover');
    var src = tags['' + dragged_tag_id];
    if(src) moveTag(src, '');
  });
})();

function updateTagsList() {
  var entries = Object.entries(tags);
  var isReverse = sortTags[1] == 'desc';
  sortByKey(entries, function(e) { return e[1][sortTags[0]]; }, isReverse);

  // The list in the left panel

  // Empty the list
  while(tags_list.firstChild) {
    var first = tags_list.firstChild;
    if(first.classList
     && first.classList.contains('special-item-button')) {
      break;
    }
    tags_list.removeChild(first);
  }
  // Fill up the list again, as a tree
  var before = tags_list.firstChild;

  // Build the tree: node = {path, tag|null, children: {name: node}}
  var root = {path: '', tag: null, children: {}};
  function nodeFor(path) {
    if(!path) return root;
    var parts = path.split(TAG_SEP);
    var node = root;
    var acc = '';
    for(var i = 0; i < parts.length; ++i) {
      acc = acc ? acc + TAG_SEP + parts[i] : parts[i];
      if(!node.children[parts[i]]) {
        node.children[parts[i]] = {path: acc, tag: null, children: {}};
      }
      node = node.children[parts[i]];
    }
    return node;
  }
  for(var i = 0; i < entries.length; ++i) {
    nodeFor(entries[i][1].path).tag = entries[i][1];
  }
  function subtreeCount(node) {
    var n = node.tag ? node.tag.count : 0;
    var kids = Object.values(node.children);
    for(var i = 0; i < kids.length; ++i) n += subtreeCount(kids[i]);
    return n;
  }
  function sortedChildren(node) {
    var kids = Object.values(node.children);
    sortByKey(kids, function(k) {
      return sortTags[0] === 'count' ? subtreeCount(k) : tagLeafName(k.path);
    }, isReverse);
    return kids;
  }

  function renderNode(node, depth) {
    var kids = sortedChildren(node);
    var has_kids = kids.length > 0;
    var collapsed = has_kids && tag_tree_collapsed[node.path];
    var tag = node.tag;
    var is_folder = !tag || !!tag.is_folder;
    var elem = document.createElement('li');
    elem.className = 'list-group-item tag-row' + (tag ? '' : ' tag-row-virtual') + (is_folder ? ' tag-row-folder' : '');
    elem.style.paddingLeft = (0.75 + depth * 1.1) + 'rem';
    elem.setAttribute('data-tag-path', node.path);
    if(tag) elem.setAttribute('data-tag-id', tag.id);
    if(current_tag !== null && current_tag !== '' && tag
     && (tag.path === current_tag || tagIsDescendant(tag.path, current_tag))) {
      elem.classList.add('tag-current');
    }
    var own = tag ? tag.count : 0;
    var total = subtreeCount(node);
    var countHtml = '';
    if(tag && !is_folder) {
      countHtml += '<span class="badge badge-secondary badge-pill" id="tag-' + tag.id + '-count" title="' + total + '">' + own + '</span>';
    }
    if(has_kids || is_folder) {
      countHtml += '<span class="tag-subcount' + (is_folder ? ' tag-subcount-folder' : '') + '" data-subcount-path="' + escapeHtml(node.path) + '" title="' + gettext("including sub-tags") + '">' + total + '</span>';
    }
    var iconHtml;
    if(is_folder) {
      iconHtml = '<i class="fas ' + (collapsed || !has_kids ? 'fa-folder' : 'fa-folder-open') + ' tag-folder-icon" style="color: ' + (tag ? tagColor(tag.id, 0.9) : 'var(--se-text-muted)') + ';"></i>';
    } else {
      iconHtml = '<span class="tag-swatch" style="background-color: ' + tagColor(tag.id, 0.8) + ';"></span>';
    }
    elem.innerHTML =
      '<div class="d-flex justify-content-between align-items-center">' +
      '  <div class="tag-name">' +
      '    <a href="javascript:void(0)" class="tag-chevron' + (has_kids ? '' : ' tag-chevron-empty') + (collapsed ? ' collapsed' : '') + '"><i class="fas fa-chevron-down"></i></a>' +
      iconHtml +
      (tag
        ? '    <a id="tag-link-' + tag.id + '" class="' + (is_folder ? 'tag-folder-name' : '') + '">' + escapeHtml(tagLeafName(tag.path)) + '</a>'
        : '    <span class="tag-virtual-name" title="' + gettext("Implicit folder: no tag or folder with this name exists, only sub-tags") + '">' + escapeHtml(tagLeafName(node.path)) + '</span>') +
      '  </div>' +
      '  <div class="tag-row-actions">' + countHtml +
      (is_folder ? '    <a href="javascript:void(0)" class="btn btn-outline-primary btn-sm tag-row-add" title="' + gettext("New tag in this folder") + '"><i class="fas fa-plus"></i></a>' : '') +
      (tag ? '    <a href="javascript:editTag(' + tag.id + ');" class="btn btn-primary btn-sm">' + gettext("Edit") + '</a>' : '') +
      '  </div>' +
      '</div>';
    tags_list.insertBefore(elem, before);
    if(tag) {
      linkTag(document.getElementById('tag-link-' + tag.id), tag.path);
      setupTagDrag(elem, tag);
    } else {
      setupTagDrag(elem, null);
    }
    var addBtn = elem.querySelector('.tag-row-add');
    if(addBtn) {
      addBtn.addEventListener('click', function(e) {
        e.preventDefault();
        createTag(node.path);
      });
    }
    if(has_kids) {
      elem.querySelector('.tag-chevron').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        tag_tree_collapsed[node.path] = !tag_tree_collapsed[node.path];
        saveTagTreeState();
        updateTagsList();
      });
    }
    if(!collapsed) {
      for(var i = 0; i < kids.length; ++i) {
        renderNode(kids[i], depth + 1);
      }
    }
  }
  var top = sortedChildren(root);
  for(var i = 0; i < top.length; ++i) {
    renderNode(top[i], 0);
  }
  if(entries.length == 0) {
    var elem = document.createElement('div');
    elem.className = 'list-group-item disabled';
    elem.textContent = gettext("There are no tags in this project yet.");
    tags_list.insertBefore(elem, before);
  }

  // The list in the highlight modal
  updateModalTagsList();

  // Re-set all highlights, to update titles
  var hl_entries = Object.entries(highlights);
  for(var i = 0; i < hl_entries.length; ++i) {
    setHighlight(hl_entries[i][1]);
  }

  if(quickpick_state) {
    quickpickRender();
  }

  console.log("Highlights updated");
}

function updateModalTagsList() {
  var entries = Object.entries(tags).filter(function(e) { return !e[1].is_folder; });
  // Save previous checked statuses
  var checked_tags = [];
  for(var i = 0; i < entries.length; ++i) {
    var id = entries[i][1].id;
    var checkbox = document.getElementById('highlight-add-tags-' + id);
    if(checkbox && checkbox.checked) {
      checked_tags.push(id);
    }
  }

  // Empty the list
  while(tags_modal_list.firstChild) {
    var first = tags_modal_list.firstChild;
    if(first.classList
     && first.classList.contains('special-item-button')) {
      break;
    }
    tags_modal_list.removeChild(first);
  }

  // Apply search
  var searchFor = document.getElementById('highlight-search').value;
  if(searchFor.length > 0) {
    entries.forEach(function(e) {
      if(e[1].path.indexOf(searchFor) > -1) {
        e[1].searchGroup = '0';
      } else {
        e[1].searchGroup = '1';
      }
    });
  } else {
    entries.forEach(function(e) {
      delete e[1].searchGroup;
    });
  }

  sortByKey(entries, function(e) { return e[1].searchGroup + e[1].path; });

  // Fill up the list again
  // TODO: Show this as a tree
  var tree = {};
  var before = tags_modal_list.firstChild;
  for(var i = 0; i < entries.length; ++i) {
    var tag = entries[i][1];
    var elem = document.createElement('li');
    var searchHitClass = '';
    if(searchFor.length > 0) {
      if(tag.searchGroup == '0') {
        searchHitClass = 'font-weight-bold';
      } else {
        searchHitClass = 'text-muted';
      }
    }
    elem.className = 'tag-name form-check ' + searchHitClass;
    elem.innerHTML =
      '<input type="checkbox" class="form-check-input" value="' + tag.id + '" name="highlight-add-tags" id="highlight-add-tags-' + tag.id + '" />' +
      '<label for="highlight-add-tags-' + tag.id + '" class="form-check-label ">' +
      '<span class="tag-swatch" style="background-color: ' + tagColor(tag.id, 0.9) + ';"></span>' +
      tagPathHtml(tag.path, true) + '</label>';
    tags_modal_list.insertBefore(elem, before);
  }
  if(entries.length == 0) {
    var elem = document.createElement('li');
    elem.textContent = gettext("no tags");
    tags_modal_list.insertBefore(elem, before);
  }

  // Re-check checkboxes
  for(var i = 0; i < checked_tags.length; ++i) {
    var cb = document.getElementById('highlight-add-tags-' + checked_tags[i]);
    if(cb) cb.checked = true;
  }

  console.log("Tags list updated");
}

var highlightSearch = document.getElementById('highlight-search');
highlightSearch.addEventListener('input', function(e) {
  updateModalTagsList();
});
highlightSearch.addEventListener('keypress', function(e) {
  if(e.key === 'Enter') {
    // If search is empty, don't prevent form submission, otherwise...
    if(highlightSearch.value.length > 0) {
      // Prevent submission
      e.preventDefault();

      // Toggle the first match
      var checkbox = document.getElementById('highlight-add-tags').querySelector('.form-check.font-weight-bold input');
      if(checkbox) {
        checkbox.checked = !checkbox.checked;

        // Reset the search
        highlightSearch.value = '';
        updateModalTagsList();
      }
    }
  }
});

function highlightModalReset() {
  document.getElementById('highlight-add-memo').value = '';
  document.getElementById('highlight-add-form').reset();
  updateModalTagsList();
}

updateTagsList();

function tagSubtreeCount(path) {
  var n = 0;
  var entries = Object.values(tags);
  for(var i = 0; i < entries.length; ++i) {
    if(entries[i].path === path || tagIsDescendant(entries[i].path, path)) {
      n += entries[i].count;
    }
  }
  return n;
}

function updateTagCount(id, delta) {
  var tag = tags['' + id];
  tag.count += delta;
  var elem = document.getElementById('tag-' + id + '-count');
  if(elem) {
    elem.textContent = tag.count;
  }
  // Refresh the subtree totals of this tag and its ancestors
  var path = tag.path;
  while(path) {
    var sub = document.querySelector('.tag-subcount[data-subcount-path="' + CSS.escape(path) + '"]');
    if(sub) {
      sub.textContent = tagSubtreeCount(path);
    }
    path = tagParentPath(path);
  }
}

var tag_add_modal = document.getElementById('tag-add-modal');
var tag_color_input = document.getElementById('tag-add-color');
var tag_color_custom = document.getElementById('tag-add-color-custom');
var tag_color_palette = document.getElementById('tag-add-palette');

// Set the color in the tag editor ('' means automatic)
function setTagEditorColor(color) {
  tag_color_input.value = color || '';
  var swatches = tag_color_palette.getElementsByClassName('palette-swatch');
  for(var i = 0; i < swatches.length; ++i) {
    var c = swatches[i].getAttribute('data-color');
    swatches[i].classList.toggle('selected', c === (color || ''));
  }
  if(color) {
    tag_color_custom.value = color;
  }
  var preview = document.getElementById('tag-add-color-preview');
  var tag_id = document.getElementById('tag-add-id').value;
  preview.style.backgroundColor = color
    ? hexToRgba(color, 0.9)
    : (tag_id ? autoTagColor(parseInt(tag_id), 0.9) : 'rgba(170, 170, 180, 0.9)');
}

// Build the palette (rebuilt when the theme changes)
function buildTagPalette() {
  TAG_PALETTE = themeTagPalette();
  while(tag_color_palette.firstChild) {
    tag_color_palette.removeChild(tag_color_palette.firstChild);
  }
  var auto = document.createElement('a');
  auto.href = 'javascript:void(0)';
  auto.className = 'palette-swatch palette-auto';
  auto.setAttribute('data-color', '');
  auto.setAttribute('title', gettext("Automatic color"));
  auto.textContent = 'A';
  auto.addEventListener('click', function() { setTagEditorColor(''); });
  tag_color_palette.appendChild(auto);
  for(var i = 0; i < TAG_PALETTE.length; ++i) {
    (function(c) {
      var sw = document.createElement('a');
      sw.href = 'javascript:void(0)';
      sw.className = 'palette-swatch';
      sw.setAttribute('data-color', c);
      sw.style.backgroundColor = c;
      sw.addEventListener('click', function() { setTagEditorColor(c); });
      tag_color_palette.appendChild(sw);
    })(TAG_PALETTE[i]);
  }
}
buildTagPalette();
document.addEventListener('taguette-theme-changed', buildTagPalette);
tag_color_custom.addEventListener('input', function() {
  setTagEditorColor(tag_color_custom.value);
});

$(tag_add_modal).on('shown.bs.modal', function() {
  document.getElementById('tag-add-path').focus();
});

var tag_parent_select = document.getElementById('tag-add-parent');

// Fill the "parent tag" dropdown (excluding the tag being edited and its sub-tags)
function fillTagParentSelect(exclude_tag, selected_path) {
  while(tag_parent_select.firstChild) {
    tag_parent_select.removeChild(tag_parent_select.firstChild);
  }
  var none = document.createElement('option');
  none.value = '';
  none.textContent = gettext("(top level)");
  tag_parent_select.appendChild(none);
  var entries = Object.values(tags);
  sortByKey(entries, function(t) { return t.path; });
  for(var i = 0; i < entries.length; ++i) {
    var t = entries[i];
    if(exclude_tag && (t.id === exclude_tag.id || tagIsDescendant(t.path, exclude_tag.path))) continue;
    var opt = document.createElement('option');
    opt.value = t.path;
    opt.textContent = '\u00a0\u00a0'.repeat(tagDepth(t.path)) + tagLeafName(t.path);
    tag_parent_select.appendChild(opt);
  }
  tag_parent_select.value = selected_path || '';
  if(tag_parent_select.value !== (selected_path || '')) {
    // Parent exists only virtually (no tag with that exact path): add it
    var opt = document.createElement('option');
    opt.value = selected_path;
    opt.textContent = selected_path;
    tag_parent_select.appendChild(opt);
    tag_parent_select.value = selected_path;
  }
}

function createTag(parent_path, as_folder) {
  document.getElementById('tag-add-form').reset();
  document.getElementById('tag-add-id').value = '';
  fillTagParentSelect(null, parent_path || (current_tag && tagByPath(current_tag) ? current_tag : ''));
  setTagEditorColor('');
  document.getElementById('tag-add-folder').checked = !!as_folder;
  document.getElementById('tag-add-label-folder').style.display = as_folder ? '' : 'none';
  document.getElementById('tag-add-label-new').style.display = as_folder ? 'none' : '';
  document.getElementById('tag-add-label-change').style.display = 'none';
  document.getElementById('tag-add-cancel').style.display = '';
  document.getElementById('tag-add-delete').style.display = 'none';
  document.getElementById('tag-add-merge').style.display = 'none';
  $(tag_add_modal).modal();
}

function createFolder(parent_path) {
  createTag(parent_path, true);
}

function editTag(tag_id) {
  document.getElementById('tag-add-form').reset();
  document.getElementById('tag-add-folder').checked = !!tags['' + tag_id].is_folder;
  document.getElementById('tag-add-label-folder').style.display = 'none';
  document.getElementById('tag-add-id').value = '' + tag_id;
  document.getElementById('tag-add-path').value = tagLeafName(tags['' + tag_id].path);
  fillTagParentSelect(tags['' + tag_id], tagParentPath(tags['' + tag_id].path));
  document.getElementById('tag-add-description').value = tags['' + tag_id].description;
  setTagEditorColor(tags['' + tag_id].color || '');
  document.getElementById('tag-add-label-new').style.display = 'none';
  document.getElementById('tag-add-label-change').style.display = '';
  document.getElementById('tag-add-cancel').style.display = 'none';
  document.getElementById('tag-add-delete').style.display = '';
  document.getElementById('tag-add-merge').style.display = '';
  $(tag_add_modal).modal();
}

// Save tag button
document.getElementById('tag-add-form').addEventListener('submit', function(e) {
  e.preventDefault();

  var tag_id = document.getElementById('tag-add-id').value;
  if(tag_id) {
    tag_id = parseInt(tag_id);
  } else {
    tag_id = null;
  }
  var tag_path = document.getElementById('tag-add-path').value.trim();
  if(!tag_path) {
    alert(gettext("Invalid tag name"));
    return;
  }
  if(tag_parent_select.value) {
    tag_path = tag_parent_select.value + TAG_SEP + tag_path;
  }
  var req;
  if(tag_id !== null) {
    console.log("Posting update for tag " + tag_id);
    req = postJSON(
      '/api/project/' + project_id + '/tag/' + tag_id,
      {path: tag_path,
       description: document.getElementById('tag-add-description').value,
       color: tag_color_input.value || null,
       is_folder: document.getElementById('tag-add-folder').checked}
    );
  } else {
    console.log("Posting new tag");
    req = postJSON(
      '/api/project/' + project_id + '/tag/new',
      {path: tag_path,
       description: document.getElementById('tag-add-description').value,
       color: tag_color_input.value || null,
       is_folder: document.getElementById('tag-add-folder').checked}
    );
  }
  showSpinner();
  req.then(function(reply) {
    console.log("Tag posted");

    // Check this tag in the list, or remember to check it once it appears
    var tag_checkbox = document.getElementById('highlight-add-tags-' + reply.id);
    if(tag_checkbox) {
      tag_checkbox.checked = true;
    }
    last_added_tag = reply.id;

    $(tag_add_modal).modal('hide');
    document.getElementById('tag-add-form').reset();
  })
  .catch(function(error) {
    console.error("Failed to create tag:", error);
    alert(gettext("Couldn't create tag!") + "\n\n" + error);
  })
  .then(hideSpinner);
});

// Delete tag button
document.getElementById('tag-add-delete').addEventListener('click', function(e) {
  var tag_id = document.getElementById('tag-add-id').value;
  if(tag_id) {
    if(!window.confirm(gettext("Are you sure you want to delete the tag '%(tag)s'?", {tag: tags[tag_id].path}))) {
      e.preventDefault();
      return;
    }
    tag_id = parseInt(tag_id);
    console.log("Posting tag " + tag_id + " deletion");
    deleteURL(
      '/api/project/' + project_id + '/tag/' + tag_id
    )
    .then(function() {
      $(tag_add_modal).modal('hide');
      document.getElementById('tag-add-form').reset();
    })
    .catch(function(error) {
      console.error("Failed to delete tag:", error);
      alert(gettext("Couldn't delete tag!") + "\n\n" + error);
    });
  }
});

// Merge tags button in tag edit modal: shows merge modal
document.getElementById('tag-add-merge').addEventListener('click', function(e) {
  e.preventDefault();

  var tag_id = document.getElementById('tag-add-id').value;
  if(!tag_id)
    return;
  tag_id = parseInt(tag_id);

  document.getElementById('tag-merge-form').reset();

  // Set source tag
  document.getElementById('tag-merge-src-id').value = '' + tag_id;
  document.getElementById('tag-merge-src-name').value = tags['' + tag_id].path;

  // Empty target tag <select>
  var target = document.getElementById('tag-merge-dest');
  target.innerHTML = '';

  // Fill target tag <select>
  var entries = Object.entries(tags);
  sortByKey(entries, function(e) { return e[1].path; });
  for(var i = 0; i < entries.length; ++i) {
    if(entries[i][0] == '' + tag_id) {
      // Can't merge into itself
      continue;
    }
    var option = document.createElement('option');
    option.setAttribute('value', entries[i][0]);
    option.innerText = entries[i][1].path;
    target.appendChild(option);
  }

  $(document.getElementById('tag-merge-modal')).modal();
});

// Merge modal submit button
document.getElementById('tag-merge-form').addEventListener('submit', function(e) {
  e.preventDefault();

  var tag_src = document.getElementById('tag-merge-src-id').value;
  if(!tag_src)
    return;
  tag_src = parseInt(tag_src);

  var tag_dest = document.getElementById('tag-merge-dest').value;
  if(!tag_dest)
    return;
  tag_dest = parseInt(tag_dest);

  console.log(
    "Merging tag " + tag_src + " (" + tags['' + tag_src].path +
    ") into tag " + tag_dest + " (" + tags['' + tag_dest].path + ")");
  showSpinner();
  postJSON(
    '/api/project/' + project_id + '/tag/merge',
    {src: tag_src, dest: tag_dest}
  )
  .then(function() {
    console.log("Tag merge posted");
    $(document.getElementById('tag-merge-modal')).modal('hide');
  })
  .catch(function(error) {
    console.error("Failed to merge tags:", error);
    alert(gettext("Couldn't merge tags!") + "\n\n" + error);
  })
  .then(hideSpinner);
});


/*
 * Highlights
 */

// Add or replace a highlight
function setHighlight(highlight) {
  var id = '' + highlight.id;
  if(highlights[id]) {
    removeHighlight(id);
  }
  highlights[id] = highlight;
  var hl_tags = highlight.tags.slice();
  sortByKey(hl_tags, function(id) { return tags[id].path; });
  var tag_names = hl_tags.map(function(id) { return tags[id].path; }).join(", ");
  var color = tagColor(hl_tags.length > 0 ? hl_tags[0] : null, 0.55);
  var title = tag_names;
  if(highlight.memo) {
    title = (title ? title + ' \u2014 ' : '') + highlight.memo;
  }
  try {
    highlightSelection([highlight.start_offset, highlight.end_offset], id, highlightClicked, title, color);
    if(highlight.memo) {
      var spans = document.getElementsByClassName('highlight-' + id);
      for(var i = 0; i < spans.length; ++i) {
        spans[i].classList.add('has-memo');
      }
    }
    console.log("Highlight set:", highlight);
  } catch(error) {
    console.error(
      "Error setting highlight ", highlight.id, " ", [highlight.start_offset, highlight.end_offset],
      ":", error,
    );
  }
}

// Remove a highlight
function removeHighlight(id) {
  id = '' + id;
  if(!highlights[id]) {
    return;
  }

  delete highlights[id];
  console.log("Highlight removed:", id);
  if(quickpick_state && quickpick_state.hl_id !== null
   && '' + quickpick_state.hl_id === id) {
    quickpickClose();
  }

  // Loop over highlight-<id> elements
  var elements = document.getElementsByClassName('highlight-' + id);
  for(var i = 0; i < elements.length; ++i) {
    // Move children up and delete this element
    var node = elements[i];
    while(node.firstChild) {
      node.parentNode.insertBefore(node.firstChild, node);
    }
    node.parentNode.removeChild(node);
  }
}

// Backlight
var backlight_checkbox = document.getElementById('backlight');
backlight_checkbox.addEventListener('change', function() {
  var classes = document.getElementById('document-view').classList;
  if(backlight_checkbox.checked == classes.contains('backlight')) {
    ; // all good
  } else if(backlight_checkbox.checked) {
    classes.add('backlight');
  } else {
    classes.remove('backlight');
  }
});


/*
 * Add highlight
 */

var highlight_add_modal = document.getElementById('highlight-add-modal');

// Updates current_selection and visibility of the controls
function selectionChanged() {
  current_selection = describeSelection();
}
document.addEventListener('selectionchange', selectionChanged);

// When the mouse is released after selecting text, open the quick tag picker
document.addEventListener('mouseup', function(e) {
  if(quickpick.contains(e.target) || hlchooser.contains(e.target)) {
    return;
  }
  // Let the browser finalize the selection first
  setTimeout(function() {
    var sel = window.getSelection();
    if(sel.rangeCount == 0 || sel.isCollapsed) {
      return;
    }
    var range = sel.getRangeAt(0);
    if(!document_contents.contains(range.commonAncestorContainer)) {
      return;
    }
    if(range.toString().match(onlyWhitespace)) {
      return;
    }
    var selection = describeSelection();
    if(selection === null) {
      return;
    }
    var rect = range.getBoundingClientRect();
    quickpickOpenForSelection(selection, rect);
  }, 0);
});

function createHighlight(selection) {
  document.getElementById('highlight-add-id').value = '';
  document.getElementById('highlight-add-start').value = selection[0];
  document.getElementById('highlight-add-end').value = selection[1];
  highlightModalReset();
  $(highlight_add_modal).modal().drags({handle: '.modal-header'});
  document.getElementById('highlight-search').focus();
}

// TRANSLATORS: Key used to create a new highlight
var newtag_key = gettext('n');

document.addEventListener('keyup', function(e) {
  var tag = e.target && e.target.tagName;
  if(tag == 'INPUT' || tag == 'TEXTAREA') {
    return;
  }
  if(e.key == newtag_key && current_selection !== null) {
    createHighlight(current_selection);
  }
});

// Text of a highlight as currently displayed, shortened
function highlightSnippet(id, maxlen) {
  var elements = document.getElementsByClassName('highlight-' + id);
  var text = '';
  for(var i = 0; i < elements.length; ++i) {
    text += elements[i].textContent;
  }
  text = text.replace(/\s+/g, ' ').trim();
  if(text.length > maxlen) {
    text = text.substring(0, maxlen) + '\u2026';
  }
  return text;
}

var hlchooser = document.getElementById('hlchooser');

function hideHighlightChooser() {
  hlchooser.style.display = 'none';
  while(hlchooser.firstChild) {
    hlchooser.removeChild(hlchooser.firstChild);
  }
}
document.addEventListener('click', function(e) {
  if(!hlchooser.contains(e.target)) {
    hideHighlightChooser();
  }
});

// Show a popup to pick one of several overlapping highlights
function showHighlightChooser(ids, e) {
  hideHighlightChooser();
  var header = document.createElement('div');
  header.className = 'hlchooser-title';
  header.textContent = gettext("Overlapping highlights: pick one to edit");
  hlchooser.appendChild(header);
  for(var i = 0; i < ids.length; ++i) {
    (function(id) {
      var hl = highlights[id];
      var hl_tags = hl.tags.slice();
      sortByKey(hl_tags, function(tid) { return tags[tid].path; });
      var item = document.createElement('a');
      item.className = 'hlchooser-item';
      item.href = 'javascript:void(0)';
      var swatch = document.createElement('span');
      swatch.className = 'tag-swatch';
      swatch.style.backgroundColor = tagColor(hl_tags.length > 0 ? hl_tags[0] : null, 0.8);
      item.appendChild(swatch);
      var label = document.createElement('span');
      var names = hl_tags.map(function(tid) { return tags[tid].path; }).join(', ');
      label.textContent = (names || gettext("(no tags)"));
      item.appendChild(label);
      var snippet = document.createElement('span');
      snippet.className = 'hlchooser-snippet';
      snippet.textContent = '\u201c' + highlightSnippet(id, 40) + '\u201d';
      item.appendChild(snippet);
      item.addEventListener('click', function(ev) {
        ev.preventDefault();
        hideHighlightChooser();
        quickpickOpenForHighlight(id, ev.clientX, ev.clientY);
      });
      hlchooser.appendChild(item);
    })(ids[i]);
  }
  var scrollPos = getScrollPos();
  hlchooser.style.display = 'block';
  // Keep the popup inside the viewport
  var x = Math.min(e.clientX, window.innerWidth - hlchooser.offsetWidth - 16);
  hlchooser.style.left = (Math.max(0, x) + scrollPos.x) + 'px';
  hlchooser.style.top = (e.clientY + scrollPos.y + 12) + 'px';
}

// Click on a highlight: open it, or ask which one if several overlap here
function highlightClicked(e) {
  e.stopPropagation();
  var ids = [];
  var node = e.target;
  while(node && node !== document_contents) {
    if(node.classList && node.classList.contains('highlight')) {
      var hid = node.getAttribute('data-highlight-id');
      if(ids.indexOf(hid) == -1 && highlights[hid]) {
        ids.push(hid);
      }
    }
    node = node.parentNode;
  }
  if(ids.length <= 1) {
    quickpickOpenForHighlight(this.getAttribute('data-highlight-id'), e.clientX, e.clientY);
  } else {
    // Innermost (shortest) first
    sortByKey(ids, function(hid) {
      return highlights[hid].end_offset - highlights[hid].start_offset;
    });
    showHighlightChooser(ids, e);
  }
}

function editHighlight() {
  editHighlightById(this.getAttribute('data-highlight-id'));
}

function editHighlightById(id) {
  highlightModalReset();
  id = '' + id;
  document.getElementById('highlight-add-id').value = id;
  document.getElementById('highlight-add-start').value = highlights[id].start_offset;
  document.getElementById('highlight-add-end').value = highlights[id].end_offset;
  var hl_tags = highlights['' + id].tags;
  for(var i = 0; i < hl_tags.length; ++i) {
    var cb = document.getElementById('highlight-add-tags-' + hl_tags[i]);
    if(cb) cb.checked = true;
  }
  document.getElementById('highlight-add-memo').value = highlights['' + id].memo || '';
  $(highlight_add_modal).modal().drags({handle: '.modal-header'});
  document.getElementById('highlight-search').focus();
}

// Save highlight button
document.getElementById('highlight-add-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var highlight_id = document.getElementById('highlight-add-id').value;
  var selection = [
    parseInt(document.getElementById('highlight-add-start').value),
    parseInt(document.getElementById('highlight-add-end').value)
  ];
  var hl_tags = [];
  var entries = Object.entries(tags);
  for(var i = 0; i < entries.length; ++i) {
    var id = entries[i][1].id;
    var cb = document.getElementById('highlight-add-tags-' + id);
    if(cb && cb.checked) {
      hl_tags.push(id);
    }
  }
  var memo = document.getElementById('highlight-add-memo').value.trim() || null;
  var req;
  if(highlight_id) {
    console.log("Posting update for highlight " + highlight_id);
    req = postJSON(
      '/api/project/' + project_id + '/document/' + current_document + '/highlight/' + highlight_id,
      {start_offset: selection[0],
       end_offset: selection[1],
       tags: hl_tags,
       memo: memo}
    );
  } else {
    console.log("Posting new highlight");
    req = postJSON(
      '/api/project/' + project_id + '/document/' + current_document + '/highlight/new',
      {start_offset: selection[0],
       end_offset: selection[1],
       tags: hl_tags,
       memo: memo}
    );
  }
  showSpinner();
  req.then(function() {
    console.log("Highlight posted");
    $(highlight_add_modal).modal('hide');
    highlightModalReset();
  })
  .catch(function(error) {
    console.error("Failed to create highlight:", error);
    alert(gettext("Couldn't create highlight!") + "\n\n" + error);
  })
  .then(hideSpinner);
});

// Delete highlight button
document.getElementById('highlight-delete').addEventListener('click', function() {
  var highlight_id = document.getElementById('highlight-add-id').value;
  if(highlight_id) {
    highlight_id = parseInt(highlight_id);
    console.log("Posting highlight " + highlight_id + " deletion");
    deleteURL(
      '/api/project/' + project_id + '/document/' + current_document + '/highlight/' + highlight_id
    )
    .then(function() {
      $(highlight_add_modal).modal('hide');
      highlightModalReset();
    })
    .catch(function(error) {
      console.error("Failed to delete highlight:", error);
      alert(gettext("Couldn't delete highlight!") + "\n\n" + error);
    });
  }
});


/*
 * Quick tag picker: appears right after selecting text, or when clicking
 * a highlight. Clicking a tag applies it immediately, no modal needed.
 */

var quickpick = document.getElementById('quickpick');
var quickpick_input = document.getElementById('quickpick-search');
var quickpick_list = document.getElementById('quickpick-list');
var quickpick_snippet = document.getElementById('quickpick-snippet');
var quickpick_footer = document.getElementById('quickpick-footer');
var quickpick_state = null;  // {selection, hl_id, tags, busy}
var quickpick_active = 0;    // keyboard-selected row

function quickpickRemovePending() {
  var elements = document.getElementsByClassName('highlight-pending');
  while(elements.length > 0) {
    var node = elements[0];
    while(node.firstChild) {
      node.parentNode.insertBefore(node.firstChild, node);
    }
    node.parentNode.removeChild(node);
  }
}

var quickpick_memo = document.getElementById('quickpick-memo');
var quickpick_memo_status = document.getElementById('quickpick-memo-status');
var quickpick_memo_timer = null;

function quickpickClose() {
  if(!quickpick_state) {
    return;
  }
  quickpickFlushMemo();
  quickpickRemovePending();
  quickpick_state = null;
  quickpick.style.display = 'none';
  quickpick_input.value = '';
  quickpick_memo.value = '';
  quickpick_memo_status.textContent = '';
}

// Save the memo if it changed (debounced while typing, flushed on close)
function quickpickFlushMemo() {
  var st = quickpick_state;
  if(!st) return;
  if(quickpick_memo_timer !== null) {
    clearTimeout(quickpick_memo_timer);
    quickpick_memo_timer = null;
  }
  var memo = quickpick_memo.value.trim();
  if(memo === (st.memo || '')) return;
  if(st.hl_id === null && !memo) return;
  quickpickSaveMemo(memo);
}

function quickpickSaveMemo(memo) {
  var st = quickpick_state;
  if(!st) return;
  if(st.busy) {
    // Try again shortly
    quickpick_memo_timer = setTimeout(quickpickFlushMemo, 300);
    return;
  }
  st.busy = true;
  quickpick_memo_status.textContent = gettext("Saving\u2026");
  var base = '/api/project/' + project_id + '/document/' + current_document + '/highlight/';
  var url = st.hl_id !== null ? base + st.hl_id : base + 'new';
  var body = st.hl_id !== null
    ? {memo: memo}
    : {start_offset: st.selection[0], end_offset: st.selection[1], tags: st.tags, memo: memo};
  postJSON(url, body)
  .then(function(reply) {
    st.busy = false;
    if(quickpick_state !== st) return;
    if(st.hl_id === null) {
      st.hl_id = reply.id;
      quickpickRemovePending();
    }
    st.memo = memo;
    if(highlights['' + st.hl_id]) {
      highlights['' + st.hl_id].memo = memo || null;
    }
    quickpick_memo_status.textContent = gettext("Saved");
    quickpickRender();
  })
  .catch(function(error) {
    st.busy = false;
    quickpick_memo_status.textContent = gettext("Error");
    console.error("Failed to save memo:", error);
  });
}

quickpick_memo.addEventListener('input', function() {
  if(quickpick_memo_timer !== null) clearTimeout(quickpick_memo_timer);
  quickpick_memo_status.textContent = '';
  quickpick_memo_timer = setTimeout(quickpickFlushMemo, 700);
});
quickpick_memo.addEventListener('keydown', function(e) {
  if(e.key === 'Escape') {
    e.preventDefault();
    quickpickClose();
  } else if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    quickpickFlushMemo();
  }
});
(function() {
  var chips = quickpick.getElementsByClassName('memo-chip');
  for(var i = 0; i < chips.length; ++i) {
    chips[i].addEventListener('mousedown', function(e) { e.preventDefault(); });
    chips[i].addEventListener('click', function(e) {
      e.preventDefault();
      var prefix = this.getAttribute('data-chip') + ' ';
      if(quickpick_memo.value.indexOf(prefix) !== 0) {
        quickpick_memo.value = prefix + quickpick_memo.value;
      }
      quickpick_memo.focus();
      quickpick_memo.setSelectionRange(quickpick_memo.value.length, quickpick_memo.value.length);
      quickpick_memo.dispatchEvent(new Event('input'));
    });
  }
})();

function quickpickPosition(x, y, prefer_above_y) {
  quickpick.style.display = 'block';
  var scrollPos = getScrollPos();
  var w = quickpick.offsetWidth, h = quickpick.offsetHeight;
  x = Math.max(8, Math.min(x, window.innerWidth - w - 16));
  if(y + h > window.innerHeight - 8 && prefer_above_y - h - 8 > 0) {
    y = prefer_above_y - h - 8;
  }
  quickpick.style.left = (x + scrollPos.x) + 'px';
  quickpick.style.top = (y + scrollPos.y) + 'px';
}

function quickpickOpenForSelection(selection, rect) {
  if(quickpick_state && quickpick_state.hl_id === null
   && quickpick_state.selection[0] == selection[0]
   && quickpick_state.selection[1] == selection[1]) {
    return;  // already open for this selection
  }
  quickpickClose();
  quickpick_state = {selection: selection, hl_id: null, tags: [], memo: '', busy: false};
  quickpick_memo.value = '';
  quickpick_memo_status.textContent = '';
  // Show the future highlight right away
  highlightSelection(selection, 'pending', function(e) { e.stopPropagation(); }, '', themeAccent(0.4));
  quickpick_active = 0;
  quickpickRender();
  quickpickPosition(rect.left, rect.bottom + 8, rect.top);
  quickpick_input.focus({preventScroll: true});
}

function quickpickOpenForHighlight(id, x, y) {
  quickpickClose();
  var hl = highlights['' + id];
  if(!hl) {
    return;
  }
  quickpick_state = {
    selection: [hl.start_offset, hl.end_offset],
    hl_id: parseInt(id),
    tags: hl.tags.slice(),
    memo: hl.memo || '',
    busy: false,
  };
  quickpick_memo.value = hl.memo || '';
  quickpick_memo_status.textContent = '';
  quickpick_active = 0;
  quickpickRender();
  quickpickPosition(x, y + 12, y);
  quickpick_input.focus({preventScroll: true});
}

function quickpickFiltered() {
  var query = quickpick_input.value.trim();
  var entries = Object.values(tags).filter(function(t) { return !t.is_folder; });
  if(query) {
    entries = entries.filter(function(t) { return t.path.indexOf(query) > -1; });
    // Exact match first, then prefix matches, then alphabetical
    sortByKey(entries, function(t) {
      return (t.path === query ? '0' : t.path.indexOf(query) === 0 ? '1' : '2') + t.path;
    });
  } else {
    sortByKey(entries, function(t) { return t.path; });
  }
  return entries;
}

function quickpickRender() {
  var st = quickpick_state;
  if(st === null) {
    return;
  }
  // Snippet
  var snippet = st.hl_id !== null
    ? highlightSnippet(st.hl_id, 60)
    : (function() {
        var elems = document.getElementsByClassName('highlight-pending');
        var text = '';
        for(var i = 0; i < elems.length; ++i) text += elems[i].textContent;
        text = text.replace(/\s+/g, ' ').trim();
        return text.length > 60 ? text.substring(0, 60) + '\u2026' : text;
      })();
  quickpick_snippet.textContent = snippet;

  // Tag rows
  while(quickpick_list.firstChild) {
    quickpick_list.removeChild(quickpick_list.firstChild);
  }
  var query = quickpick_input.value.trim();
  var entries = quickpickFiltered();
  var exact = entries.some(function(t) { return t.path === query; });
  var rows = entries.length + ((query && !exact) ? 1 : 0);
  if(quickpick_active >= rows) quickpick_active = Math.max(0, rows - 1);

  entries.forEach(function(tag, idx) {
    var row = document.createElement('a');
    row.href = 'javascript:void(0)';
    row.className = 'quickpick-row';
    if(st.tags.indexOf(tag.id) > -1) row.classList.add('checked');
    if(idx === quickpick_active) row.classList.add('active');
    row.innerHTML =
      '<span class="quickpick-check"><i class="fas fa-check"></i></span>' +
      '<span class="tag-swatch" style="background-color: ' + tagColor(tag.id, 0.9) + ';"></span>' +
      '<span class="quickpick-name">' + tagPathHtml(tag.path, true) + '</span>';
    row.addEventListener('mousedown', function(e) { e.preventDefault(); });  // keep input focus
    row.addEventListener('click', function(e) {
      e.preventDefault();
      quickpickToggle(tag.id);
    });
    quickpick_list.appendChild(row);
  });
  if(query && !exact) {
    var row = document.createElement('a');
    row.href = 'javascript:void(0)';
    row.className = 'quickpick-row quickpick-create';
    if(entries.length === quickpick_active) row.classList.add('active');
    row.innerHTML =
      '<span class="quickpick-check"><i class="fas fa-plus"></i></span>' +
      '<span class="quickpick-name">' +
      gettext("Create tag \u201c%(tag)s\u201d", {tag: escapeHtml(query)}) +
      '</span>';
    row.addEventListener('mousedown', function(e) { e.preventDefault(); });
    row.addEventListener('click', function(e) {
      e.preventDefault();
      quickpickCreateTag(query);
    });
    quickpick_list.appendChild(row);
  }
  if(rows === 0) {
    var empty = document.createElement('div');
    empty.className = 'quickpick-empty';
    empty.textContent = gettext("Type a name to create a tag");
    quickpick_list.appendChild(empty);
  }

  // Footer
  while(quickpick_footer.firstChild) {
    quickpick_footer.removeChild(quickpick_footer.firstChild);
  }
  if(st.hl_id !== null) {
    var details = document.createElement('a');
    details.href = 'javascript:void(0)';
    details.textContent = gettext("Details\u2026");
    details.addEventListener('click', function(e) {
      e.preventDefault();
      var id = st.hl_id;
      quickpickClose();
      editHighlightById(id);
    });
    quickpick_footer.appendChild(details);
    var del = document.createElement('a');
    del.href = 'javascript:void(0)';
    del.className = 'quickpick-delete';
    del.textContent = gettext("Delete highlight");
    del.addEventListener('click', function(e) {
      e.preventDefault();
      var id = st.hl_id;
      deleteURL('/api/project/' + project_id + '/document/' + current_document + '/highlight/' + id)
      .then(quickpickClose)
      .catch(function(error) {
        console.error("Failed to delete highlight:", error);
        alert(gettext("Couldn't delete highlight!") + "\n\n" + error);
      });
    });
    quickpick_footer.appendChild(del);
  } else {
    var hint = document.createElement('span');
    hint.className = 'quickpick-hint';
    hint.textContent = gettext("Click a tag to highlight \u00b7 Esc to cancel");
    quickpick_footer.appendChild(hint);
  }
}

function quickpickSave(tag_ids) {
  var st = quickpick_state;
  if(st === null || st.busy) {
    return;
  }
  st.busy = true;
  var base = '/api/project/' + project_id + '/document/' + current_document + '/highlight/';
  var url = st.hl_id !== null ? base + st.hl_id : base + 'new';
  var body = {start_offset: st.selection[0], end_offset: st.selection[1], tags: tag_ids};
  if(st.hl_id === null) {
    var memo = quickpick_memo.value.trim();
    if(memo) {
      body.memo = memo;
      st.memo = memo;
    }
  }
  postJSON(url, body)
  .then(function(reply) {
    if(quickpick_state !== st) return;
    if(st.hl_id === null) {
      st.hl_id = reply.id;
      quickpickRemovePending();
    }
    st.tags = tag_ids;
    st.busy = false;
    quickpickRender();
  })
  .catch(function(error) {
    st.busy = false;
    console.error("Failed to save highlight:", error);
    alert(gettext("Couldn't create highlight!") + "\n\n" + error);
  });
}

function quickpickToggle(tag_id) {
  var st = quickpick_state;
  if(st === null) return;
  var cur = st.tags.slice();
  var idx = cur.indexOf(tag_id);
  if(idx > -1) cur.splice(idx, 1); else cur.push(tag_id);
  quickpick_input.value = '';
  quickpickSave(cur);
}

function quickpickCreateTag(path) {
  var st = quickpick_state;
  if(st === null || !path) return;
  postJSON('/api/project/' + project_id + '/tag/new',
           {path: path, description: '', color: null})
  .then(function(reply) {
    if(quickpick_state !== st) return;
    quickpick_input.value = '';
    quickpickToggle(reply.id);
  })
  .catch(function(error) {
    console.error("Failed to create tag:", error);
    alert(gettext("Couldn't create tag!") + "\n\n" + error);
  });
}

quickpick_input.addEventListener('input', function() {
  quickpick_active = 0;
  quickpickRender();
});
quickpick_input.addEventListener('keydown', function(e) {
  if(!quickpick_state) return;
  var query = quickpick_input.value.trim();
  var entries = quickpickFiltered();
  var exact = entries.some(function(t) { return t.path === query; });
  var rows = entries.length + ((query && !exact) ? 1 : 0);
  if(e.key === 'Escape') {
    e.preventDefault();
    quickpickClose();
  } else if(e.key === 'ArrowDown') {
    e.preventDefault();
    if(rows > 0) quickpick_active = (quickpick_active + 1) % rows;
    quickpickRender();
  } else if(e.key === 'ArrowUp') {
    e.preventDefault();
    if(rows > 0) quickpick_active = (quickpick_active - 1 + rows) % rows;
    quickpickRender();
  } else if(e.key === 'Enter') {
    e.preventDefault();
    if(e.shiftKey && query && !exact) {
      quickpickCreateTag(query);
    } else if(quickpick_active < entries.length) {
      quickpickToggle(entries[quickpick_active].id);
    } else if(query && !exact) {
      quickpickCreateTag(query);
    }
  }
});

// Close when clicking anywhere else
document.addEventListener('mousedown', function(e) {
  if(quickpick_state && !quickpick.contains(e.target)) {
    quickpickClose();
  }
});
document.addEventListener('keydown', function(e) {
  if(e.key === 'Escape' && quickpick_state) {
    quickpickClose();
  }
});


/*
 * Members
 */

function addMember(login, privileges) {
  members[login] = {privileges: privileges};
}

function removeMember(login) {
  delete members[login];
}

var members_modal = document.getElementById('members-modal');
var members_initial = {};
var members_displayed = {};

function _memberRow(login, user, can_edit, is_self) {
  var elem = document.createElement('div');
  elem.className = 'row members-item';
  elem.innerHTML =
    '<div class="col-md-4">' +
    '  <p class="members-item-login">' + login + '</p>' +
    '</div>' +
    '<div class="col-md-4 form-group">' +
    '  <select class="form-control"' + (can_edit?'':' disabled') + '>' +
    '    <option value="ADMIN">' + gettext("Full permissions") + '</option>' +
    '    <option value="MANAGE_DOCS">' + gettext("Can't change collaborators / delete project") + '</option>' +
    '    <option value="TAG">' + gettext("View & make changes") + '</option>' +
    '    <option value="READ">' + gettext("View only") + '</option>' +
    '  </select>' +
    '</div>' +
    (is_self?
    '<button type="button" class="btn btn-danger col-md-4 form-group">Leave project</button>'
    :
    '<button type="button" class="btn btn-danger col-md-4 form-group"' + (can_edit?'':' disabled') + '>Remove collaborator</button>'
    );

  [].forEach.call(elem.querySelectorAll('option'), function(e) {
    if(e.value == user.privileges) {
      e.selected = true;
    }
  });

  elem.querySelector('button').addEventListener('click', function() {
    elem.parentNode.removeChild(elem);
    delete members_displayed[login];
  });

  return elem;
}

function showMembers() {
  document.getElementById('members-add').reset();

  can_edit = members[user_login].privileges == 'ADMIN';

  if(can_edit) {
    document.getElementById('members-add-fields').removeAttribute('disabled');
  } else {
    document.getElementById('members-add-fields').setAttribute('disabled', 1);
  }

  var entries = Object.entries(members);
  sortByKey(entries, function(e) { return e[0]; });
  console.log(
    "Members:",
    entries.map(function(e) { return e[0] + " (" + e[1].privileges + ")"; })
    .join(", ")
  );

  // Empty the list
  var current_members = document.getElementById('members-current');
  current_members.innerHTML = '';

  // Fill it back up
  for(var i = 0; i < entries.length; ++i) {
    var login = entries[i][0];
    var user = entries[i][1];
    var elem = _memberRow(login, user, can_edit, login == user_login);

    current_members.appendChild(elem);
  }

  // Store current state so that we can compare later
  members_initial = Object.assign({}, members);
  members_displayed = Object.assign({}, members);

  $(members_modal).modal();
}

document.getElementById('members-add').addEventListener('submit', function(e) {
  e.preventDefault();

  var login = document.getElementById('member-add-name').value.toLowerCase();
  if(!login) { return; }
  var privileges = document.getElementById('member-add-privileges').value;

  // Check login
  if(login in members_displayed) {
    alert(gettext("Already a member!"));
    document.getElementById('members-add').reset();
    return;
  }
  postJSON(
    '/api/check_user',
    {login: login}
  )
  .then(function(result) {
    if(result.exists) {
      // Add it at the top
      var elem = _memberRow(login, {privileges: privileges});
      var current_members = document.getElementById('members-current');
      current_members.insertBefore(elem, current_members.firstChild);
      members_displayed[login] = true;

      document.getElementById('members-add').reset();
    } else {
      alert(gettext("This user doesn't exist!"));
    }
  })
});

function sendMembersPatch() {
  var patch = {};

  var members_before = Object.assign({}, members_initial);

  var rows = document.getElementById('members-current').querySelectorAll('.members-item');
  for(var i = 0; i < rows.length; ++i) {
    var row = rows[i];
    var login = row.querySelector('.members-item-login').textContent;
    var privileges = row.querySelector('select').value;

    // Add to patch, if different from stored version
    if(!members_before[login] || members_before[login].privileges != privileges) {
      patch[login] = {privileges: privileges};
    }

    // Remove from object, so what's left are the removed members
    delete members_before[login];
  }

  // Remove the members that are left
  var entries = Object.entries(members_before);
  for(var i = 0; i < entries.length; ++i) {
    patch[entries[i][0]] = null;
  }

  console.log("Patching members list");
  showSpinner();
  patchJSON(
    '/api/project/' + project_id + '/members',
    patch
  )
  .then(function() {
    console.log("Members list patched");
    $(members_modal).modal('hide');
  })
  .catch(function(error) {
    console.error("Failed to patch members list:", error);
    alert(gettext("Couldn't update collaborators!") + "\n\n" + error);
  })
  .then(hideSpinner);

  members_initial = {};
}

document.getElementById('members-submit').addEventListener('click', function(e) {
  e.preventDefault();
  sendMembersPatch();
});

document.getElementById('members-current').addEventListener('submit', function(e) {
  e.preventDefault();
  sendMembersPatch();
});


/*
 * Load contents
 */

var document_contents = document.getElementById('document-contents');
var export_button = document.getElementById('export-button');

function loadDocument(document_id) {
  if(document_id === null) {
    document_contents.style.direction = 'ltr';
    document_contents.innerHTML = '<p style="font-style: oblique; text-align: center;">' + gettext("Load a document on the left") + '</p>';
    return;
  }
  showSpinner();
  var info = getJSON(
    '/api/project/' + project_id + '/document/' + document_id
  );
  var contents = getJSON(
    '/api/project/' + project_id + '/document/' + document_id + '/contents'
  );
  Promise.all([info, contents])
  .then(function(results) {
    var info = results[0];
    var contents = results[1];
    document_contents.innerHTML = '';
    highlights = {};
    chunk_offsets = [];
    for(var i = 0; i < contents.contents.length; ++i) {
      var chunk = contents.contents[i];
      var elem = document.createElement('div');
      elem.setAttribute('id', 'doc-offset-' + chunk.offset);
      elem.innerHTML = chunk.contents;
      document_contents.appendChild(elem);
      chunk_offsets.push(chunk.offset);
    }
    if(info.text_direction === 'RIGHT_TO_LEFT') {
      document_contents.style.direction = 'rtl';
    } else {
      document_contents.style.direction = 'ltr';
    }
    current_document = document_id;

    // Update current document highlight in left panel
    var document_links = document.getElementsByClassName('document-link-current');
    for(var i = document_links.length - 1; i >= 0; --i) {
      document_links[i].classList.remove('document-link-current');
    }
    var document_link = document.getElementById('document-link-' + current_document);
    if(document_link) {
      document_link.classList.add('document-link-current');
    }

    current_tag = null;
    var tag_links = document.getElementsByClassName('tag-current');
    for(var i = tag_links.length - 1; i >= 0; --i) {
      tag_links[i].classList.remove('tag-current');
    }
    console.log("Loaded document", document_id);
    for(var i = 0; i < info.highlights.length; ++i) {
      setHighlight(info.highlights[i]);
    }
    console.log("Loaded " + info.highlights.length + " highlights");

    // Update export button
    export_button.style.display = '';
    var items = export_button.getElementsByClassName('dropdown-item');
    for(var i = 0; i < items.length; ++i) {
      var ext = items[i].getAttribute('data-extension');
      if(items[i].getAttribute('data-document') !== 'false') {
        items[i].setAttribute(
          'href',
          base_path + '/project/' + project_id + '/export/document/' + document_id + '.' + ext,
        );
        items[i].style.display = '';
      } else {
        items[i].style.display = 'none';
      }
    }

    // Scroll up
    window.setTimeout(function() { window.scrollTo(0, 0); }, 0);
  })
  .catch(function(error) {
    console.error("Failed to load document:", error);
    alert(gettext("Error loading document!") + "\n\n" + error);
  })
  .then(hideSpinner);
}

function loadTag(tag_path, page) {
  if(page === undefined) {
    page = 1;
  }
  showSpinner();
  getJSON(
    '/api/project/' + project_id + '/highlights/' + encodeURIComponent(tag_path) + '?page=' + page
  )
  .then(function(result) {
    console.log("Loaded highlights for tag", tag_path || "''");
    document_contents.style.direction = 'ltr';
    current_tag = tag_path;
    current_document = null;
    var document_links = document.getElementsByClassName('document-link-current');
    for(var i = document_links.length - 1; i >= 0; --i) {
      document_links[i].classList.remove('document-link-current');
    }
    // No need to clear the 'tag-current', we are calling updateTagsList() below
    document_contents.innerHTML = '';
    highlights = {};
    for(var i = 0; i < result.highlights.length; ++i) {
      var hl = result.highlights[i];
      var content = document.createElement('div');
      if(hl.text_direction === 'RIGHT_TO_LEFT') {
        content.style.direction = 'rtl';
      } else {
        content.style.direction = 'ltr';
      }
      content.innerHTML = result.highlights[i].content;
      var elem = document.createElement('div');
      elem.className = 'highlight-entry';
      elem.setAttribute('id', 'highlight-entry-' + hl.id);
      elem.appendChild(content);
      if(hl.memo) {
        var memo = document.createElement('div');
        memo.className = 'highlight-memo';
        memo.textContent = hl.memo;
        elem.appendChild(memo);
      }
      elem.appendChild(document.createTextNode(' '));

      var doclink = document.createElement('a');
      doclink.className = 'badge badge-light';
      doclink.textContent = documents['' + hl.document_id].name;
      linkDocument(doclink, hl.document_id);
      elem.appendChild(doclink);
      elem.appendChild(document.createTextNode(' '));

      var tag_names = hl.tags.map(function(tag) { return tags['' + tag].path; });
      tag_names.sort();
      for(var j = 0; j < tag_names.length; ++j) {
        if(j > 0) {
          elem.appendChild(document.createTextNode(' '));
        }
        var taglink = document.createElement('a');
        taglink.className = 'badge badge-dark';
        taglink.textContent = tag_names[j];
        linkTag(taglink, taglink.textContent);
        elem.appendChild(taglink);
      }

      document_contents.appendChild(elem);
    }
    if(result.highlights.length == 0) {
      document_contents.innerHTML = '<p style="font-style: oblique; text-align: center;">' + gettext("No highlights with this tag yet.") + '</p>';
    }

    // Pagination controls
    function makePageLink(page_nb, label, current, enabled) {
      var item;
      if(current) {
        item = document.createElement('li');
        item.className = 'page-item active';
        item.innerHTML = '<span class="page-link">' + label + '<span class="sr-only">(current)</span></span>';
      } else if(!enabled) {
        item = document.createElement('li');
        item.className = 'page-item disabled';
        item.innerHTML = '<span class="page-link">' + label + '</span>';
      } else {
        item = document.createElement('li');
        item.className = 'page-item';
        var link = document.createElement('a');
        link.className = 'page-link';
        link.setAttribute('href', '#');
        link.innerText = label;
        link.addEventListener('click', function(e) {
          e.preventDefault();
          loadTag(tag_path, page_nb);
        });
        item.appendChild(link);
      }
      return item;
    }
    if(result.pages > 1 || page !== 1) {
      if(result.pages === undefined && page !== 1) {
        result.pages = 1;
      }
      pagination = document.createElement('nav');
      pagination.setAttribute('aria-label', "Page navigation");
      var pagination_ul = document.createElement('ul');
      pagination_ul.className = 'pagination justify-content-center';
      var min_page = Math.max(2, page - 2);
      var max_page = Math.min(result.pages - 1, page + 2);

      // Previous button
      pagination_ul.appendChild(makePageLink(page - 1, "Previous", false, page > 1));
      // Page 1
      pagination_ul.appendChild(makePageLink(1, 1, 1 === page, 1 !== page));
      // "..." between 1 and other pages, if appropriate
      if(min_page > 2) {
        pagination_ul.appendChild(makePageLink(page, "...", false, false));
      }
      // Other pages
      for(var i = min_page; i <= max_page; ++i) {
        pagination_ul.appendChild(makePageLink(i, i, i === page, i !== page));
      }
      // "..." between other pages and last page, if appropriate
      if(max_page < result.pages - 1) {
        pagination_ul.appendChild(makePageLink(page, "...", false, false));
      }
      // Last page
      pagination_ul.appendChild(makePageLink(result.pages, result.pages, result.pages === page, result.pages !== page));
      // Next button
      pagination_ul.appendChild(makePageLink(page + 1, "Next", false, page < result.pages));

      pagination.appendChild(pagination_ul);
      document_contents.appendChild(pagination);
    }

    updateTagsList();

    // Update export button
    export_button.style.display = '';
    var items = export_button.getElementsByClassName('dropdown-item');
    for(var i = 0; i < items.length; ++i) {
      var ext = items[i].getAttribute('data-extension');
      if(items[i].getAttribute('data-highlights') !== 'false') {
        items[i].setAttribute(
          'href',
          base_path + '/project/' + project_id + '/export/highlights/' + encodeURIComponent(tag_path) + '.' + ext,
        );
        items[i].style.display = '';
      } else {
        items[i].style.display = 'none';
      }
    }

    // Scroll up
    window.setTimeout(function() { window.scrollTo(0, 0); }, 0);
  })
  .catch(function(error) {
    console.error("Failed to load tag highlights:", error);
    alert(gettext("Error loading tag highlights!") + "\n\n" + error);
  })
  .then(hideSpinner);
}

// Load the document if the URL includes one
setTimeout(
  function() {
    var _document_url = new RegExp('^' + escapeRegExp(base_path) + '/project/([0-9]+)/document/([0-9]+)');
    // Don't use RegExp literals https://github.com/python-babel/babel/issues/640
    var m = window.location.pathname.match(_document_url);
    if(m) {
      loadDocument(parseInt(m[2]));
    }
    // Or a tag
    var _tag_url = new RegExp('^' + escapeRegExp(base_path) + '/project/([0-9]+)/highlights/([^/]*)');
    m = window.location.pathname.match(_tag_url);
    if(m) {
      loadTag(decodeURIComponent(m[2]));
    }
  },
  0,
);


// Load documents as we go through browser history
window.onpopstate = function(e) {
  if(e.state) {
    if(e.state.document_id !== undefined) {
      loadDocument(e.state.document_id);
    } else if(e.state.tag_path !== undefined) {
      loadTag(e.state.tag_path);
    } else {
      loadDocument(null);
    }
  } else {
    loadDocument(null);
  }
};


/*
 * Long polling
 */

// null: active now
// Date: inactive since then
var windowLastActive = new Date();
if(document.hasFocus()) {
  windowLastActive = null; // Focused now
}

window.addEventListener('focus', function() {
  // We are active as long as we have the focus
  windowLastActive = null;
  maybeResumePolling();
});
window.addEventListener('mousemove', function() {
  if(windowLastActive !== null) {
    // If the mouse moved over the window and we're not focused, refresh timer
    windowLastActive = new Date();
    maybeResumePolling();
  }
});
window.addEventListener('blur', function() {
  // We lost focus, start timer
  windowLastActive = new Date();
});

var lastPoll = null;
var polling = true;

function maybeResumePolling() {
  if(!polling) {
    longPollForEvents();
  }
}

function longPollForEvents() {
  // If we've been inactive for 10min, pause polling for now
  if(windowLastActive !== null && (new Date() - windowLastActive > 600000)) {
    console.log("Browser window inactive, stop polling");
    polling = false;
    return;
  }

  polling = true;
  lastPoll = Date.now();
  getJSON(
    '/api/project/' + project_id + '/events',
    {version: version, from: last_event}
  )
  .then(function(result) {
    if(result.reload) {
      console.log("Server sent signal to reload");
      window.location.reload();
      return;
    }
    for(var i = 0; i < result.events.length; ++i) {
      var event = result.events[i];
      if(event.type === 'project_meta') {
        setProjectMetadata({
          project_name: event.project_name,
          description: event.description
        });
      } else if(event.type === 'document_add') {
        addDocument({
          id: event.document_id,
          name: event.document_name,
          description: event.description,
          text_direction: event.text_direction
        });
      } else if(event.type === 'document_delete') {
        removeDocument(event.document_id);
      } else if(event.type === 'highlight_add') {
        if(event.document_id === current_document) {
          setHighlight({
            id: event.highlight_id,
            start_offset: event.start_offset,
            end_offset: event.end_offset,
            tags: event.tags,
            memo: event.memo || null
          });
        }
      } else if(event.type === 'highlight_delete') {
        removeHighlight(event.highlight_id);
      } else if(event.type === 'tag_add') {
        addTag({
          id: event.tag_id,
          path: event.tag_path,
          description: event.description,
          color: event.color || null,
          is_folder: !!event.is_folder
        });
      } else if(event.type === 'tag_delete') {
        removeTag(event.tag_id);
      } else if(event.type === 'tag_merge') {
        mergeTags(event.src_tag_id, event.dest_tag_id);
      } else if(event.type === 'member_add') {
        addMember(event.member, event.privileges);
      } else if(event.type === 'member_remove') {
        removeMember(event.member);
      }

      if('tag_count_changes' in event) {
        var entries = Object.entries(event.tag_count_changes);
        for(var i = 0; i < entries.length; ++i) {
          updateTagCount(entries[i][0], entries[i][1]);
        }
      }
      last_event = event.id;
    }

    // Re-open connection
    setTimeout(longPollForEvents, 1);
  }, function(error) {
    console.error("Polling failed:", error);
    if(error instanceof ApiError && error.status == 403) {
      alert(gettext("It appears that you have been logged out."));
      window.location = '/';
    } else if(error instanceof ApiError && error.status == 404) {
      alert(gettext("You can no longer access this project."));
      window.location = '/';
    } else {
      setTimeout(longPollForEvents, Math.max(1, 5000 + lastPoll - Date.now()));
    }
  })
  .catch(function(error) {
    console.error("Polling function error:", error);
  });
}
longPollForEvents();
