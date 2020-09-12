"use strict";

const scaleBetween = (unscaledNum, minAllowed, maxAllowed, min, max) => {
    return (maxAllowed - minAllowed) * (unscaledNum - min) / (max - min) + minAllowed;
}

const relType2Color = {
    'isGrandParentOf': '#a88ebe', // grandchild
    'hasGrandParent': '#eda268', // grandparent

    'isGreatGrandParentOf': '#d688aa', // great-grandchild
    'hasGreatGrandParent': '#e77a68', // great-grandparent

    'isUncleOf': '#e9ca7a', //niece or nephew
    'isGreatUncleOf': '#e9ca7a',
    'isAuntOf': '#e9ca7a',
    'isGreatAuntOf': '#e9ca7a',

    'hasUncle': '#c683ea', // uncle or aunt
    'hasGreatUncle': '#c683ea',
    'hasAunt': '#c683ea',
    'hasGreatAunt': '#c683ea',

    'isBrotherOf': '#6da296', // sibling
    'isSisterOf': '#6da296',
    'isSiblingOf': '#6da296',

    'isFirstCousinOf': '#6795fe', //cousin
    'isSecondCousinOf': '#6795fe',
    'isThirdCousinOf': '#6795fe'
};

let otherRelationships = {};

let cy = null;
let nodesArray = [];

const searchNode = (selectedVal) => {
    const searchIndex = nodesArray.findIndex(n => n.data().id === selectedVal);

    if (searchIndex !== -1) {
        highlightNetwork(nodesArray[searchIndex]);
        nodesArray[searchIndex].tippy.show();
    }
};

const highlightNetwork = (sel) => {
    cy.startBatch();
    cy.elements()
        .difference(sel.outgoers()
            .union(sel.incomers()))
        .not(sel)
        .addClass('semitransp');

    const selId = sel.data().id;
    if (otherRelationships[selId]) {
        let o = otherRelationships[selId];
        for (const key in o) {
            if (o.hasOwnProperty(key)) {
                for (let i = 0; i < o[key].length; i++) {
                    let idx = nodesArray.findIndex(p => p.data().id === o[key][i]);
                    if (idx !== -1) {
                        let n = nodesArray[idx];
                        n.removeClass('semitransp');
                        n.addClass('highlight');
                        n.style({ 'background-color': relType2Color[key] });
                    }
                }
            }
        }
    }
    sel.addClass('root-highlight');
    sel.outgoers().union(sel.incomers()).addClass('highlight');
    cy.endBatch();
};

const resetNetwork = sel => {
    cy.startBatch();
    cy.elements().removeClass('semitransp highlight root-highlight');
    cy.nodes().style({ 'background-color': '#fff' });
    cy.endBatch();
};

const resetButtonClickHandler = () => {
    $('#search').autocomplete('close').val('');
    resetNetwork();
};

const makePopper = el => {
    if (el.isNode()) {
        let ref = el.popperRef(); // used only for positioning

        el.tippy = tippy(ref, { // tippy options:
            theme: 'normanblue',
            offset: '250,250',
            zIndex: 99999,
            content: () => {
                let content = document.createElement('div');

                let allTitles = [].concat(el.data().honorificPrefixes, el.data().honorificSuffixes);

                let titles = allTitles.length > 0 ?
                    `<tr><td>${allTitles.length > 1 ? 'Titles' : 'Title'}</td><td>${allTitles.reduce((accum, title, index, titles) => {
                        return accum + (titles.length > 1 && index + 1 === titles.length ? ' and ' : ', ') + title;
                    })}</td></tr>`
                    : '';

                let alternateNames = el.data().alternateNames.length > 0 ?
                    `<tr><td>Alternate ${el.data().alternateNames.length > 1 ? 'Spellings' : 'Spelling'}</td><td>${el.data().alternateNames.reduce((accum, name, index, names) => {
                        return accum + (names.length > 1 && index + 1 === names.length ? ' or ' : ', ') + name;
                    })}</td></tr>`
                    : '';

                let images = el.data().images.length > 0 ?
                    `<tr><td>${el.data().images.length > 1 ? 'Images' : 'Image'}</td><td>${el.data().images.reduce((accum, image) => {
                        return accum = accum + `<div class="person-image-container"><img class="person-image" src="data/${image}"></div>`;
                    }, '')}</td></tr>`
                    : '';

                let birthDate = el.data().birthDate && el.data().birthDate.length > 0 ?
                    `<tr><td>Birth Date</td><td>${el.data().birthDate}</td></tr>` : '';

                let birthPlace = el.data().birthPlace && el.data().birthPlace.length > 0 ?
                    `<tr><td>Birth Place</td><td>${el.data().birthPlace}</td></tr>` : '';

                let deathDate = el.data().deathDate && el.data().deathDate.length > 0 ?
                    `<tr><td>Death Date</td><td>${el.data().deathDate}</td></tr>` : '';

                let deathPlace = el.data().deathPlace && el.data().deathPlace.length > 0 ?
                    `<tr><td>Death Place</td><td>${el.data().deathPlace}</td></tr>` : '';

                content.innerHTML = `
                <div class='label'>${el.data().label}</div>
                <table><tbody>
                    ${alternateNames}
                    ${birthDate}
                    ${birthPlace}
                    ${deathDate}
                    ${deathPlace}
                    ${titles}
                    ${images}
                </tbody></table>

            `;

                return content;
            },
            trigger: 'manual', // probably want manual mode
            arrow: true,
            placement: 'bottom',
        });
    }
};

const positionTooltip = (e) => {
    const el = e.target;

    const tooltipEl = $(el).find("div.list-item-tooltip");

    if (tooltipEl.length > 0) {
        const left = el.offsetLeft;
        const top = -10;
        const height = $(el).height();
        const width = $(el).width();
        const tooltiph = tooltipEl.height();

        const yPos = Math.ceil(tooltiph / height) * top;
        const xPos = left + width + 10 - 250;

        tooltipEl.css("top", yPos + "px");
        tooltipEl.css("left", xPos + "px");

        tooltipEl.fadeIn('fast');
    }
};

const fadeTooltip = (e) => {
    const el = e.target;
    const tooltipEl = $(el).find("div.list-item-tooltip");
    if (tooltipEl.length > 0) {
        tooltipEl.fadeOut('fast');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    let optArray = [];

    cy = cytoscape({
        container: document.getElementById('cy'),
        autounselectify: true,
        boxSelectionEnabled: false,
        layout: {
            name: 'fcose',
            nodeDimensionsIncludeLabels: true,
            stop: () => {
                const loading = document.getElementById('loading');
                loading.classList.add('loaded');
            }
        },
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'color': '#000',
                    'background-color': '#fff',
                    'border-color': '#000',
                    'border-width': '1px',
                    'border-style': 'solid',
                    'font-family': '"Libre Baskerville", serif',
                    'text-opacity': 0.5,
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'width': 'data(size)',
                    'height': 'data(size)',
                }
            },
            {
                selector: 'edge[type = \"isFatherOf\"]',
                style: {
                    'line-color': '#6f93ad',
                    'mid-target-arrow-color': '#6f93ad',
                    'mid-target-arrow-shape': 'triangle',
                    'mid-target-arrow-fill': 'filled',
                }
            },
            {
                selector: 'edge[type = \"isMotherOf\"]',
                style: {
                    'line-color': '#ff76b8',
                    'mid-target-arrow-color': '#ff76b8',
                    'mid-target-arrow-shape': 'triangle',
                    'mid-target-arrow-fill': 'filled',
                }
            },
            {
                selector: 'edge[type = \"isWifeOf\"]',
                style: {
                    'line-color': '#73a567',
                }
            },
            {
                selector: 'edge[type = \"isHusbandOf\"]',
                style: {
                    'line-color': '#73a567',
                }
            },
            {
                selector: 'edge[type = \"isSpouseOf\"]',
                style: {
                    'line-color': '#73a567',
                }
            },
            {
                selector: 'node.highlight',
                style: {
                    'border-width': '3px',
                    'text-opacity': '1'
                }

            },
            {
                selector: 'node.root-highlight',
                style: {
                    'border-width': '6px',
                    'text-opacity': '1',
                    'background-fill': 'linear-gradient',
                    'background-gradient-stop-colors': 'yellow gold orange'
                }

            },
            {
                selector: 'node.semitransp',
                style: { 'opacity': '0.2' }
            },
            {
                selector: 'edge.semitransp',
                style: { 'opacity': '0.1' }
            }
        ],
        elements: fetch('data/nsp.json')
            .then(res => { return res.json(); })
            .then(graph => {
                const nuclearRelationshipTypes = new Set(['isWifeOf', 'isMotherOf', 'isFatherOf', 'isHusbandOf', 'isSpouseOf']);
                const edges = graph.edges.filter(e => nuclearRelationshipTypes.has(e.data.type));

                otherRelationships = graph.edges.filter(e => !nuclearRelationshipTypes.has(e.data.type)).reduce((a, e) => {
                    if (e.data.source !== e.data.target) {
                        if (a[e.data.source]) {
                            if (a[e.data.source][e.data.type]) {
                                a[e.data.source][e.data.type].push(e.data.target);
                            }
                            else {
                                a[e.data.source][e.data.type] = [e.data.target];
                            }
                        } else {
                            const o = {};
                            o[e.data.type] = [e.data.target];
                            a[e.data.source] = o;
                        }
                    }
                    return a;
                }, {});

                const nodeSize = graph.nodes.length;

                for (let i = 0; i < nodeSize; ++i) {

                    let alternateNames = graph.nodes[i].data.alternateNames.length > 0 ?
                        `(${graph.nodes[i].data.alternateNames.reduce((accum, name, index, names) => {
                            return accum + (names.length > 1 && index + 1 === names.length ? ' or ' : ', ') + name;
                        })})`
                        : '';

                    let allTitles = [].concat(graph.nodes[i].data.honorificPrefixes, graph.nodes[i].data.honorificSuffixes);

                    let allTitlesStr = allTitles.length > 0 ?
                        `${allTitles.reduce((accum, title, index, titles) => {
                            return accum + (titles.length > 1 && index + 1 === titles.length ? ' and ' : ', ') + title;
                        })}`
                        : '';

                    let birthDate = graph.nodes[i].data.birthDate && graph.nodes[i].data.birthDate.length > 0 ?
                        `b. ${graph.nodes[i].data.birthDate}` : undefined;

                    let birthPlace = graph.nodes[i].data.birthPlace && graph.nodes[i].data.birthPlace.length > 0 ?
                        `${graph.nodes[i].data.birthPlace}` : undefined;

                    let deathDate = graph.nodes[i].data.deathDate && graph.nodes[i].data.deathDate.length > 0 ?
                        `d. ${graph.nodes[i].data.deathDate}` : undefined;

                    let deathPlace = graph.nodes[i].data.deathPlace && graph.nodes[i].data.deathPlace.length > 0 ?
                        `${graph.nodes[i].data.deathPlace}` : undefined;

                    let tooltipData = `${[[birthDate, birthPlace].filter(Boolean).join(' at '), [deathDate, deathPlace].filter(Boolean).join(' at '), allTitlesStr].filter(Boolean).join('; ')}`

                    optArray.push({
                        label: graph.nodes[i].data.label,
                        value: graph.nodes[i].data.id,
                        desc: alternateNames,
                        tooltipData,
                    });
                }

                graph.edges = Object.assign([], edges);

                return graph;
            })
            .then(graph => {
                const edgesSize = graph.edges.length;
                for (let i = 0; i < edgesSize; ++i) {
                    const e = graph.edges[i];
                    let sourceIndex = graph.nodes.findIndex(p => p.data.id === e.data.source);
                    if (sourceIndex !== -1) {
                        graph.nodes[sourceIndex].data.degree += 1;
                    }
                    let targetIndex = graph.nodes.findIndex(p => p.data.id === e.data.target);
                    if (targetIndex !== -1) {
                        graph.nodes[targetIndex].data.degree += 1;
                    }
                };

                const max = Math.max.apply(Math, graph.nodes.map(n => n.data.degree));
                const min = Math.min.apply(Math, graph.nodes.map(n => n.data.degree));

                const scaledMin = 10;
                const scaledMax = 100;

                const nodesSize = graph.nodes.length;

                for (let i = 0; i < nodesSize; ++i) {
                    graph.nodes[i].data.size = scaleBetween(graph.nodes[i].data.degree, scaledMin, scaledMax, min, max);
                }

                return graph;
            })
    });

    cy.on('mouseover', 'node', (e) => {
        highlightNetwork(e.target);
        e.target.tippy.show();
    });

    cy.on('mouseout', 'node', (e) => {
        resetNetwork(e.target);
        e.target.tippy.hide();
    });

    cy.on('ready', (e) => {
        nodesArray = cy.nodes().toArray();
        cy.elements().forEach(el => {
            makePopper(el);
        });
    });

    cy.panzoom({
        // options here...
    });

    optArray = optArray.sort();

    $('#search').autocomplete({
        minLength: 0,
        source: optArray,
        position: {
            my: "left bottom",
            at: "left top",
            of: $("#search"),
            collision: "flip flip"
        },
        focus: (event, ui) => {
            $('#search').val(ui.item.label);
            return false;
        },
        select: (event, ui) => {
            $('#search').val(ui.item.label);
            resetNetwork();
            searchNode(ui.item.value);
            return false;
        },
        open: (event, ui) => {
            $("div.list-item").on('mouseover', positionTooltip);
            $("div.list-item").on('mouseout', fadeTooltip);
        },
        close: (event, ui) => {
            $("div.list-item").off('mouseover', positionTooltip);
            $("div.list-item").off('mouseout', fadeTooltip);
        },
    })
        .autocomplete("instance")._renderItem = (ul, item) => {
            return $('<li>')
                .append(`
                <div class="list-item" id="${item.value}">
                    ${item.label}${item.tooltipData.length > 0 ? '*' : ''}
                    <div class="list-item-description">${item.desc}</div>
                    ${item.tooltipData.length > 0 ? `<div class="list-item-tooltip">${item.tooltipData}</div>` : ''}  
                </div>`)
                .appendTo(ul)
        };

    $('#reset').click(() => {
        resetButtonClickHandler();
    });



    window.onkeydown = (e) => {
        const keyCode = e.key || e.keyIdentifier || e.keyCode;
        if (keyCode === 27 || keyCode === 'Escape') {
            resetButtonClickHandler();
        }
    }
});