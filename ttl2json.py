#!/usr/bin/env python3

import sys
import json
import rdflib

RELS_TO_DRAW = ['isWifeOf', 'isMotherOf', 'isFatherOf']
RELS_TO_INFER = ['hasGrandParent', 'isGrandParentOf', 'hasGreatGrandParent',
                 'isGreatGrandParentOf', 'isUncleOf', 'hasUncle',
                 'isGreatUncleOf', 'hasGreatUncle', 'isAuntOf', 'hasAunt',
                 'isGreatAuntOf', 'hasGreatAunt',
                 'isBrotherOf', 'isSisterOf',
                 'isFirstCousinOf', 'isSecondCousinOf', 'isThirdCousinOf']
RELS_OF_INTEREST = RELS_TO_DRAW + RELS_TO_INFER

try:
    workpath = sys.argv[1]
except IndexError:
    sys.exit("No path defined!")
try:
    recursion_limit = int(sys.argv[2])
except IndexError:
    recursion_limit = 0

if recursion_limit > 0:
    sys.setrecursionlimit(recursion_limit)

g = rdflib.Graph()
g.parse(workpath, format="turtle")

FHKB = rdflib.Namespace("http://www.example.com/genealogy.owl#")
SCHEMA_ORG = rdflib.Namespace("http://schema.org/")


def dump(uriref):
    if uriref.__contains__('#'):
        return uriref.split('#')[-1]
    return uriref.split('/')[-1]


graph = {}
graph['nodes'] = []
graph['edges'] = []

for i in g.subjects(object=FHKB.Person):
    for p, o in g.predicate_objects(subject=i):
        if p.startswith(FHKB) and dump(p) in RELS_OF_INTEREST:
            graph['edges'].append(
                {
                    'data': {
                        'group': 'edges',
                        'id': f'{dump(i)}-{dump(p)}-{dump(o)}',
                        'source': dump(i),
                        'target': dump(o),
                        'type': dump(p)
                    }
                })

    node = {
        'data': {
            'degree': 0,
            'size': 10,
            'alternateNames': [],
            'honorificPrefixes': [],
            'honorificSuffixes': [],
            'images': [],
        }
    }

    for p, o in g.predicate_objects(subject=i):
        if p == FHKB.Sex:
            node['data'][dump(p)] = dump(o)
        elif p.startswith(SCHEMA_ORG):
            if dump(p) == 'honorificSuffix':
                node['data']['honorificSuffixes'].append(o)
            elif dump(p) == 'honorificPrefix':
                node['data']['honorificPrefixes'].append(o)
            elif dump(p) == 'alternateName':
                node['data']['alternateNames'].append(o)
            elif dump(p) == 'image':
                node['data']['images'].append(o)
            else:
                node['data'][dump(p)] = o
        elif p == rdflib.OWL.sameAs:
            node['data']['id'] = dump(o)
        elif p == rdflib.RDFS.label:
            node['data']['label'] = o
        else:
            continue

    if 'label' in node['data']:
        graph['nodes'].append(node)

print(json.dumps(graph, indent=0))
sys.exit(0)
