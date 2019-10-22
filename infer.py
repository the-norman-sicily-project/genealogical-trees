#!/usr/bin/env python3

import sys
import time

import rdflib

from owlrl import DeductiveClosure, OWLRL_Extension


try: workpath = sys.argv[1]
except IndexError: sys.exit("No path defined!")
try: recursion_limit = int(sys.argv[2])
except IndexError: recursion_limit = 0

if recursion_limit > 0: sys.setrecursionlimit(recursion_limit)

g = rdflib.Graph()
g.parse(workpath, format="turtle")

print("Recursion stack limit:", sys.getrecursionlimit())
print("Triples before:", len(g))
starttime = time.time()
DeductiveClosure(OWLRL_Extension).expand(g)
print("Done in %1.2f sc" % (time.time() - starttime))
print("Triples after:", len(g))

outpath = workpath + ".inferred"
g.serialize(destination=outpath, format="turtle")
sys.exit(0)
