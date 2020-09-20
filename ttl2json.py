#!/usr/bin/env python3

import sys
import json
import rdflib
import rdflib.plugins.sparql as sparql

RELS_TO_DRAW = ['isWifeOf', 'isMotherOf', 'isFatherOf', 'isHusbandOf', 'isSpouseOf']
RELS_TO_INFER = ['hasGrandParent', 'isGrandParentOf', 'hasGreatGrandParent',
                 'isGreatGrandParentOf', 'isUncleOf', 'hasUncle',
                 'isGreatUncleOf', 'hasGreatUncle', 'isAuntOf', 'hasAunt',
                 'isGreatAuntOf', 'hasGreatAunt',
                 'isBrotherOf', 'isSisterOf', 'isSiblingOf',
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

fhkb_str = "http://www.example.com/genealogy.owl#"
schema_str = "https://schema.org/"

FHKB = rdflib.Namespace(fhkb_str)
SCHEMA_ORG = rdflib.Namespace(schema_str)

def dump(uriref):
    if uriref.__contains__('#'):
        return uriref.split('#')[-1]
    return uriref.split('/')[-1]

graph = {}
graph['nodes'] = []
graph['edges'] = []

nodes = {}

q = sparql.prepareQuery(
"""PREFIX fhkb:<http://www.example.com/genealogy.owl#> 
   SELECT ?person ?pred ?obj
   WHERE { 
       ?person a fhkb:Person ; 
       ?pred ?obj .
    } 
    ORDER BY ?person""")

for rel in RELS_OF_INTEREST:
    pred = rdflib.URIRef("{}{}".format(fhkb_str, rel))
    relation_query_results = g.query(q, initBindings={'pred': pred})
    for (subj, pred, obj) in relation_query_results:
        graph['edges'].append(
            {
                'data': {
                    'group': 'edges',
                    'id': f'{dump(subj)}-{dump(pred)}-{dump(obj)}',
                    'source': dump(subj),
                    'target': dump(obj),
                    'type': dump(pred)
                }
            })

q_details = sparql.prepareQuery(
"""PREFIX fhkb:<http://www.example.com/genealogy.owl#>
   SELECT ?person ?pred ?obj
   WHERE { 
       ?person a fhkb:Person ; 
           ?pred ?obj . 
   FILTER NOT EXISTS {
       ?person ?testPred ?obj .
       VALUES ?testPred {
           fhkb:isWifeOf
           fhkb:isMotherOf
           fhkb:isFatherOf
           fhkb:isHusbandOf
           fhkb:isSpouseOf
           fhkb:hasGrandParent
           fhkb:isGrandParentOf
           fhkb:hasGreatGrandParent
           fhkb:isGreatGrandParentOf
           fhkb:isUncleOf
           fhkb:hasUncle
           fhkb:isGreatUncleOf
           fhkb:hasGreatUncle
           fhkb:isAuntOf
           fhkb:hasAunt
           fhkb:isGreatAuntOf
           fhkb:hasGreatAunt
           fhkb:isBrotherOf
           fhkb:isSisterOf
           fhkb:isSiblingOf
           fhkb:isFirstCousinOf
           fhkb:isSecondCousinOf
           fhkb:isThirdCousinOf

           fhkb:hasRelation
           fhkb:isPartnerIn
           fhkb:isMalePartnerIn
           fhkb:isFemalePartnerIn
           fhkb:isBloodrelationOf
       }
   }
} 
ORDER BY ?person"""
)

person_query_results = g.query(q_details)    
for (subj, pred, obj) in person_query_results: 
    node = nodes.get(dump(subj), {
                'data': {
                    'label': '',
                    'degree': 0,
                    'size': 10,
                    'alternateNames': [],
                    'honorificPrefixes': [],
                    'honorificSuffixes': [],
                    'images': [],
                    'id': dump(subj),
                }}) 
    
    if pred == FHKB.Sex:
        node['data'][dump(pred)] = dump(obj)
    elif pred.startswith(SCHEMA_ORG):
        if dump(pred) == 'honorificSuffix':
            node['data']['honorificSuffixes'].append(obj)
        elif dump(pred) == 'honorificPrefix':
            node['data']['honorificPrefixes'].append(obj)
        elif dump(pred) == 'alternateName':
            node['data']['alternateNames'].append(obj)
        elif dump(pred) == 'image':
            node['data']['images'].append(obj)
        else:
            node['data'][dump(pred)] = obj
    elif pred == rdflib.RDFS.label:
        node['data']['label'] = obj
    else:
        continue
    
    nodes[dump(subj)] = node

graph['nodes'] = list(nodes.values())

print(json.dumps(graph, indent=0))
sys.exit(0)
