# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a semantic web genealogical trees project that converts GEDCOM files into interactive family tree visualizations using OWL ontologies and RDF reasoning. The project implements the Family History Knowledge Base (FHKB) ontology to perform logical reasoning on genealogical relationships.

## Architecture

The system follows a multi-stage pipeline:

1. **GEDCOM → TTL**: `gedcom2ttl.py` converts GEDCOM genealogy files to Turtle RDF format using the FHKB ontology
2. **Reasoning**: `infer.py` applies OWL 2 RL reasoning using a Python implementation to infer family relationships
3. **TTL → JSON**: `ttl2json.py` converts the reasoned ontology to JSON format for web visualization
4. **Visualization**: `index.html` renders interactive family trees using Cytoscape.js

The core ontology is defined in `data/header.ttl` and implements complex relationship hierarchies (ancestor, sibling, cousin, etc.) using OWL property chains and restrictions.

## Key Commands

### Processing GEDCOM Files
```bash
# Convert GEDCOM to interactive JSON visualization
./gedcom2json.sh path/to/your/gedcom.ged path/to/output.json [recursion_limit]

# Individual pipeline steps:
./gedcom2ttl.py input.ged >> output.ttl     # Convert GEDCOM to TTL
./infer.py ontology.ttl [recursion_limit]    # Apply reasoning (creates .inferred file)
./ttl2json.py ontology.ttl.inferred > graph.json  # Convert to JSON
```

### Environment Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Serve the web application locally
python -m http.server 8000
# or
php -S localhost:8000
```

## Dependencies

- **Python Libraries**: rdflib, transliterate, requests
- **Git Dependencies**: OWL-RL library, python-gedcom parser (installed from Git repos in src/)
- **Web Libraries**: Cytoscape.js, D3.js, Font Awesome, Google Fonts

## Data Structure

- `data/header.ttl`: Core FHKB ontology defining family relationships
- `data/*.ged`: GEDCOM input files
- `data/*.ttl`: Turtle RDF ontologies
- `data/*.json`: JSON graph data for visualization

## Important Implementation Details

- The FHKB ontology uses complex OWL constructs that can break many reasoners
- Reasoning is performed with a naive Python OWL 2 RL implementation, which is slow for large trees
- Default recursion limit is 1500 - increase for complex family trees
- The visualization distinguishes different relationship types with colors and edge styles
- Translation support is available via `translations.json`

## Performance Notes

- For large genealogies, reasoning can take hours with the Python implementation
- Native reasoners like Fact++ (via owl-cpp bindings) perform 100x faster but require additional setup
- The web interface loads JSON files client-side, so file size affects browser performance