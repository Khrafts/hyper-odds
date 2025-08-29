-- Initialize runner database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create basic tables (will be replaced by proper migrations later)
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(42) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    creator VARCHAR(42) NOT NULL,
    cutoff_time BIGINT NOT NULL,
    resolve_time BIGINT NOT NULL,
    subject JSONB NOT NULL,
    predicate JSONB NOT NULL,
    window JSONB NOT NULL,
    oracle_spec JSONB NOT NULL,
    economics JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resolution_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    market_address VARCHAR(42) NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    metric_type VARCHAR(50) NOT NULL,
    metric_params JSONB NOT NULL,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS metric_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    job_id UUID REFERENCES resolution_jobs(id) ON DELETE CASCADE,
    value DECIMAL NOT NULL,
    decimals INTEGER NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    data_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_markets_address ON markets(address);
CREATE INDEX IF NOT EXISTS idx_markets_resolve_time ON markets(resolve_time);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);

CREATE INDEX IF NOT EXISTS idx_resolution_jobs_market_id ON resolution_jobs(market_id);
CREATE INDEX IF NOT EXISTS idx_resolution_jobs_scheduled_for ON resolution_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_resolution_jobs_status ON resolution_jobs(status);

CREATE INDEX IF NOT EXISTS idx_metric_data_market_id ON metric_data(market_id);
CREATE INDEX IF NOT EXISTS idx_metric_data_timestamp ON metric_data(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_resolution_jobs_updated_at BEFORE UPDATE ON resolution_jobs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert some sample data for development
INSERT INTO markets (
    address, 
    title, 
    description, 
    creator, 
    cutoff_time, 
    resolve_time,
    subject,
    predicate,
    window,
    oracle_spec,
    economics
) VALUES (
    '0x1234567890123456789012345678901234567890',
    'Test Market: Will ETH be above $3000?',
    'Sample market for development testing',
    '0x9F522A1cAF502058230900E3836c6e89bA4f4939',
    EXTRACT(epoch FROM NOW() + INTERVAL '1 hour'),
    EXTRACT(epoch FROM NOW() + INTERVAL '2 hours'),
    '{"kind": 1, "token": "0x0000000000000000000000000000000000000000", "valueDecimals": 8}',
    '{"op": 0, "threshold": 300000000000}',
    '{"kind": 0, "tStart": 0, "tEnd": 0}',
    '{"primarySourceId": "COINGECKO", "fallbackSourceId": "COINBASE", "roundingDecimals": 2}',
    '{"feeBps": 500, "creatorFeeShareBps": 1000, "maxTotalPool": 1000000000}'
) ON CONFLICT (address) DO NOTHING;