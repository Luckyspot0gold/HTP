# HTP Specification v1.0

## 1. Data Format
- TruthCertificate schema
- AudioParameters schema

## 2. API Endpoints
- POST /v1/truth
- GET /v1/verify/:hash
- WebSocket /v1/stream

## 3. Consensus Algorithm
- 2/3 majority requirement
- Price deviation tolerance (0.1%)
- Merkle root calculation

## 4. Audio Mapping
- Frequency range: 200-800 Hz
- Modulation: ±50 Hz
- Tempo: 60-180 BPM

## 5. Avalanche Integration
- Contract address format
- Event emission schema
- Gas costs
