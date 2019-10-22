#!/bin/bash

set -e

if [[ -z "$1" ]] || [[ -z "$2" ]]; then
    echo "Usage: $(basename $0) path/to/gedcom.ged path/to/entailed_output.json [recursion_limit]

If not passed, recursion_limit defaults to 1,500"
    exit 0
fi

ONTONAME=$(basename $1)
TMPDIR=$(dirname $2)/$ONTONAME.$$
RECURSION_LIMIT=${3:-1500}

if [ ! -d "$TMPDIR" ]; then
    mkdir -p $TMPDIR
fi

cp data/header.ttl $TMPDIR/$ONTONAME.ttl
./gedcom2ttl.py $1 >> $TMPDIR/$ONTONAME.ttl
./infer.py $TMPDIR/$ONTONAME.ttl $RECURSION_LIMIT
./ttl2json.py $TMPDIR/$ONTONAME.ttl.inferred > $2

echo "$2 is ready, used ontologies are in $TMPDIR"
exit 0
