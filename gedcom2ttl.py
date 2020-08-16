#!/usr/bin/env python3

# This script converts GEDCOM genealogy members
# to the FHKB turtle semantic web ontology individuals.
# (A header with FHKB ontology definitions is still required.)
# TODO adoptive families (>1) are not considered (TODO?)
# Author: Evgeny Blokhin
# License: MIT

import sys
from functools import partial
from gedcom.parser import Parser
from gedcom.element.individual import IndividualElement
from gedcom.element.family import FamilyElement

try:
    workpath = sys.argv[1]
except IndexError:
    sys.exit("No gedcom defined!")


#all_names = [a.get_value() for a in individual.get_child_elements() if a.get_tag() == gedcom.tags.GEDCOM_TAG_NAME]

def get_titles(element):
    # TODO Why no NPFX???

    titles = {
        'honorific_suffixes': [a.get_value() for a in element.get_child_elements() if a.get_tag() in 'NOBI|NSFX'],
        'honorific_prefixes': [a.get_value() for a in element.get_child_elements() if a.get_tag() == 'NPFX']
    }

    return titles


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


def isName(name, term):
    return (term != name)


def sanitizeName(name):
    return ' '.join(' '.join(name.split('/')).strip().replace('"', '\\"').split())


g = Parser()
g.parse_file(workpath)
gedcom_dict = g.get_element_dictionary()
individuals, marriages = {}, {}

for k, v in gedcom_dict.items():
    if isinstance(v, IndividualElement):
        children, siblings = set(), set()
        idx = term2id(v)

        name = ' '.join(' '.join(' '.join(v.get_name()).split(
            '/')).replace('"', '\\"').split())
        given_name = v.get_name()[0].replace('"', '\\"')
        surname = v.get_name()[1].replace('"', '\\"')

        all_names = list(filter(partial(isName, name),
                                map(sanitizeName, v.get_all_names())))

        titles = get_titles(v)

        birth_date = formatGedcomDate(v.get_birth_data()[0])
        birth_place = ', '.join(filter(None, v.get_birth_data()[1].split(',')))
        death_date = formatGedcomDate(v.get_death_data()[0])
        death_place = ', '.join(filter(None, v.get_death_data()[1].split(',')))

        own_families = g.get_families(v, 'FAMS')
        for fam in own_families:
            children |= set(term2id(i)
                            for i in g.get_family_members(fam, "CHIL"))

        parent_families = g.get_families(v, 'FAMC')
        if len(parent_families):
            # NB adoptive families i.e len(parent_families)>1 are not considered (TODO?)
            for member in g.get_family_members(parent_families[0], "CHIL"):
                if member.get_pointer() == v.get_pointer():
                    continue
                siblings.add(term2id(member))

        if idx in individuals:
            children |= individuals[idx].get('children', set())
            siblings |= individuals[idx].get('siblings', set())

        individuals[idx] = {
            'sex': v.get_gender().lower(),
            'children': children,
            'siblings': siblings,
            'name': name,
            'given_name': given_name,
            'surname': surname,
            'birth_date': birth_date,
            'birth_place': birth_place,
            'death_date': death_date,
            'death_place': death_place,
            'all_names': all_names,
            'titles': titles,
        }

    elif isinstance(v, FamilyElement):
        wife, husb, children = None, None, set()
        children = set(term2id(i) for i in g.get_family_members(v, "CHIL"))

        try:
            wife = g.get_family_members(v, "WIFE")[0]
            wife = term2id(wife)
            if wife in individuals:
                individuals[wife]['children'] |= children
            else:
                individuals[wife] = {'children': children}
        except IndexError:
            pass
        try:
            husb = g.get_family_members(v, "HUSB")[0]
            husb = term2id(husb)
            if husb in individuals:
                individuals[husb]['children'] |= children
            else:
                individuals[husb] = {'children': children}
        except IndexError:
            pass

        if wife and husb:
            marriages[wife + husb] = (term2id(v), wife, husb)

for idx, val in individuals.items():
    added_terms = ''
    if val['sex'] == 'f':
        parent_predicate, sibl_predicate = "isMotherOf", "isSisterOf"
    else:
        parent_predicate, sibl_predicate = "isFatherOf", "isBrotherOf"
    if len(val['children']) > 0:
        added_terms += " ;\n    fhkb:" + parent_predicate + " " + \
            ", ".join(["fhkb:" + i for i in val['children']])
    if len(val['siblings']) > 0:
        added_terms += " ;\n    fhkb:" + sibl_predicate + " " + \
            ", ".join(["fhkb:" + i for i in val['siblings']])

    alternate_names = ''
    if len(val['all_names']) > 0:
        alternate_names = ' ;\n'.join(list(
            map(lambda n: '\tschema:alternateName \"{0}\"'.format(n), val['all_names'])))

    honorifxSuffixes = ''
    if len(val['titles']['honorific_suffixes']) > 0:
        honorifxSuffixes = ' ;\n'.join(list(map(lambda hs: '\tschema:honorificSuffix \"{0}\"'.format(
            hs), val['titles']['honorific_suffixes'])))

    honorifxPrefixes = ''
    if len(val['titles']['honorific_prefixes']) > 0:
        honorifxPrefixes = ' ;\n'.join(list(map(lambda hp: '\tschema:honorificPrefix \"{0}\"'.format(
            hp), val['titles']['honorific_prefixes'])))

    statement = 'fhkb:{0} a owl:NamedIndividual, owl:Thing{1}'.format(
        idx, added_terms)
    if len(alternate_names) > 0:
        statement += ' ;\n{0}'.format(alternate_names)
    if len(honorifxSuffixes) > 0:
        statement += ' ;\n{0}'.format(honorifxSuffixes)
    if len(honorifxPrefixes) > 0:
        statement += ' ;\n{0}'.format(honorifxPrefixes)
    if len(val['name']) > 0:
        statement += ' ;\n\trdfs:label \"{0}\"'.format(val['name'])
    if len(val['given_name']) > 0:
        statement += ' ;\n\tschema:givenName \"{0}\"'.format(val['given_name'])
    if len(val['surname']) > 0:
        statement += ' ;\n\tschema:familyName \"{0}\"'.format(val['surname'])
    if len(val['birth_date']) > 0:
        statement += ' ;\n\tschema:birthDate \"{0}\"'.format(val['birth_date'])
    if len(val['birth_place']) > 0:
        statement += ' ;\n\tschema:birthPlace \"{0}\"'.format(
            val['birth_place'])
    if len(val['death_date']) > 0:
        statement += ' ;\n\tschema:deathDate \"{0}\"'.format(val['death_date'])
    if len(val['death_place']) > 0:
        statement += ' ;\n\tschema:deathPlace \"{0}\"'.format(
            val['death_place'])
    if val['sex'] == 'f':
        statement += ";\n\tfhkb:Sex fhkb:Female"
    else:
        statement += ";\n\tfhkb:Sex fhkb:Male"
    statement += " .\n"

    print(statement)

for k, v in marriages.items():
    print("fhkb:%s a owl:NamedIndividual, owl:Thing ;\n    fhkb:hasFemalePartner fhkb:%s ;\n    fhkb:hasMalePartner fhkb:%s .\n" % v)

print("[] a owl:AllDifferent ;\n    owl:distinctMembers (")
for idx, value in individuals.items():
    print("    fhkb:" + idx)
for k, v in marriages.items():
    print("    fhkb:" + v[0])
print("    ) .")
