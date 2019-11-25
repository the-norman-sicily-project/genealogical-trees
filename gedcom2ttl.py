#!/usr/bin/env python3

# This script converts GEDCOM genealogy members
# to the FHKB turtle semantic web ontology individuals.
# (A header with FHKB ontology definitions is still required.)
# TODO adoptive families (>1) are not considered (TODO?)
# Author: Evgeny Blokhin
# License: MIT

import sys
from gedcom.parser import Parser
from gedcom.element.individual import IndividualElement
from gedcom.element.family import FamilyElement

try: workpath = sys.argv[1]
except IndexError: sys.exit("No gedcom defined!")

def term2id(el):
    return "i" + el.get_pointer().replace('@', '').lower()

def formatGedcomDate(date_string):
    return (date_string.lower()
            .replace('abt abt', 'abt')
            .replace('abt', 'ca.')
            .replace('bef bef', 'bef')
            .replace('bef ', 'before ')
            .replace('aft aft', 'aft')
            .replace('aft ', 'after')
            .replace('bet', '')
            .replace('and', '-')
            .replace('jan', 'Jan')
            .replace('feb', 'Feb')
            .replace('mar', 'Mar')
            .replace('apr', 'Apr')
            .replace('may', 'May')
            .replace('jun', 'Jun')
            .replace('jul', 'Jul')
            .replace('aug', 'Aug')
            .replace('sep', 'Sep')
            .replace('oct', 'Oct')
            .replace('nov', 'Nov')
            .replace('dec', 'Dec'))

g = Parser()
g.parse_file(workpath)
gedcom_dict = g.get_element_dictionary()
individuals, marriages = {}, {}

for k, v in gedcom_dict.items():
    if isinstance(v, IndividualElement):
        children, siblings = set(), set()
        idx = term2id(v)

        title = v.get_name()[0] + " " + v.get_name()[1]
        title = title.replace('"', '').replace('[', '').replace(']', '').replace('(', '').replace(')', '').strip()

        birth_date = v.get_birth_data()[0]
        death_date = v.get_death_data()[0]

        dates_str = ''
        if birth_date:
            dates_str = "b. " + formatGedcomDate(birth_date)

        if death_date:
            if dates_str:
                dates_str = dates_str + ' '
            dates_str = dates_str + "d. " + formatGedcomDate(death_date)

        if dates_str:
            dates_str = ' (' + dates_str + ')'

        title = title + dates_str

        own_families = g.get_families(v, 'FAMS')
        for fam in own_families:
            children |= set(term2id(i) for i in g.get_family_members(fam, "CHIL"))

        parent_families = g.get_families(v, 'FAMC')
        if len(parent_families):
            for member in g.get_family_members(parent_families[0], "CHIL"): # NB adoptive families i.e len(parent_families)>1 are not considered (TODO?)
                if member.get_pointer() == v.get_pointer():
                    continue
                siblings.add(term2id(member))

        if idx in individuals:
            children |= individuals[idx].get('children', set())
            siblings |= individuals[idx].get('siblings', set())
        individuals[idx] = {'sex': v.get_gender().lower(), 'children': children, 'siblings': siblings, 'title': title}

    elif isinstance(v, FamilyElement):
        wife, husb, children = None, None, set()
        children = set(term2id(i) for i in g.get_family_members(v, "CHIL"))

        try:
            wife = g.get_family_members(v, "WIFE")[0]
            wife = term2id(wife)
            if wife in individuals: individuals[wife]['children'] |= children
            else: individuals[wife] = {'children': children}
        except IndexError: pass
        try:
            husb = g.get_family_members(v, "HUSB")[0]
            husb = term2id(husb)
            if husb in individuals: individuals[husb]['children'] |= children
            else: individuals[husb] = {'children': children}
        except IndexError: pass

        if wife and husb: marriages[wife + husb] = (term2id(v), wife, husb)

for idx, val in individuals.items():
    added_terms = ''
    if val['sex'] == 'f':
        parent_predicate, sibl_predicate = "isMotherOf", "isSisterOf"
    else:
        parent_predicate, sibl_predicate = "isFatherOf", "isBrotherOf"
    if len(val['children']) > 0:
        added_terms += " ;\n    fhkb:" + parent_predicate + " " + ", ".join(["fhkb:" + i for i in val['children']])
    if len(val['siblings']) > 0:
        added_terms += " ;\n    fhkb:" + sibl_predicate + " " + ", ".join(["fhkb:" + i for i in val['siblings']])
    print("fhkb:%s a owl:NamedIndividual, owl:Thing%s ;\n    rdfs:label \"%s\" .\n" % (idx, added_terms, val['title']))

for k, v in marriages.items():
    print("fhkb:%s a owl:NamedIndividual, owl:Thing ;\n    fhkb:hasFemalePartner fhkb:%s ;\n    fhkb:hasMalePartner fhkb:%s .\n" % v)

print("[] a owl:AllDifferent ;\n    owl:distinctMembers (")
for idx, value in individuals.items():
    print("    fhkb:" + idx)
for k, v in marriages.items():
    print("    fhkb:" + v[0])
print("    ) .")
