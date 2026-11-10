"""add document memo and project journal

Revision ID: f7c2d4e9a1b8
Revises: e5a3c8d1f7b2
Create Date: 2026-11-10 15:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7c2d4e9a1b8'
down_revision = 'e5a3c8d1f7b2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.add_column(sa.Column('memo', sa.Text(), nullable=True))
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('journal', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('journal')
    with op.batch_alter_table('documents', schema=None) as batch_op:
        batch_op.drop_column('memo')
