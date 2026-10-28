"""add tag is_folder

Revision ID: e5a3c8d1f7b2
Revises: d2e7f1a9b4c6
Create Date: 2026-10-28 21:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5a3c8d1f7b2'
down_revision = 'd2e7f1a9b4c6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_folder', sa.Boolean(), nullable=True))


def downgrade():
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.drop_column('is_folder')
