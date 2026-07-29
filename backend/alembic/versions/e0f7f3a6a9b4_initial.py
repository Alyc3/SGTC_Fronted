"""initial

Revision ID: e0f7f3a6a9b4
Revises: 
Create Date: 2026-07-09 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e0f7f3a6a9b4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the AnalysisStatus ENUM type in postgres
    # (Matches our Python Enum mapping to lowercase string values)
    op.execute("CREATE TYPE analysis_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed')")
    
    # Create table 'analysis'
    op.create_table(
        'analysis',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('storage_path', sa.String(length=1000), nullable=False),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', name='analysis_status_enum'), nullable=False),
        sa.Column('deepfake_score', sa.Float(), nullable=True),
        sa.Column('segments_result', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('analysis')
    op.execute("DROP TYPE analysis_status_enum")
