"""add tag color

Revision ID: c0104a7e21b3
Revises: db5e31a0233d
Create Date: 2026-10-27 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c0104a7e21b3'
down_revision = 'db5e31a0233d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.add_column(sa.Column('color', sa.String(7), nullable=True))


def downgrade():
    with op.batch_alter_table('tags', schema=None) as batch_op:
        batch_op.drop_column('color')
