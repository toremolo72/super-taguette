"""add highlight memo

Revision ID: d2e7f1a9b4c6
Revises: c0104a7e21b3
Create Date: 2026-10-28 21:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd2e7f1a9b4c6'
down_revision = 'c0104a7e21b3'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('highlights', schema=None) as batch_op:
        batch_op.add_column(sa.Column('memo', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('highlights', schema=None) as batch_op:
        batch_op.drop_column('memo')
