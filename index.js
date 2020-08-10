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

    'isFirstCousinOf': '#6795fe', //cousin
    'isSecondCousinOf': '#6795fe',
    'isThirdCousinOf': '#6795fe'
};

let otherRelationships = {};

let cy = null;
let nodesArray = [];

const searchNode = (selectedVal) => {
    const searchIndex = nodesArray.findIndex(n => n.data().label === selectedVal);

    if (searchIndex !== -1) {
        highlightNetwork(nodesArray[searchIndex]);
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
    sel.addClass('highlight');
    sel.outgoers().union(sel.incomers()).addClass('highlight');
    cy.endBatch();
};

const resetNetwork = (sel) => {
    cy.startBatch();
    cy.elements().removeClass('semitransp highlight');
    cy.nodes().style({ 'background-color': '#fff' });
    cy.endBatch();
};

const resetButtonClickHandler = () => {
    $('#search').autocomplete('close').val('');
    resetNetwork();
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
                    'mid-target-arrow-color': '#73a567',
                    'mid-target-arrow-shape': 'triangle',
                    'mid-target-arrow-fill': 'filled',
                }
            },
            {
                selector: 'node.highlight',
                style: {
                    'border-width': '2px',
                    'text-opacity': '1'
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
                const nuclearRelationshipTypes = new Set(['isWifeOf', 'isMotherOf', 'isFatherOf']);
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
                    optArray.push(graph.nodes[i].data.label);
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
    });

    cy.on('mouseout', 'node', (e) => {
        resetNetwork(e.target);
    });

    cy.on('ready', (e) => {
        nodesArray = cy.nodes().toArray();
    });

    cy.panzoom({
        // options here...
    });

    optArray = optArray.sort();

    $('#search').autocomplete({
        source: optArray,
        select: (event, ui) => {
            resetNetwork();
            searchNode(ui.item.label);
        },
        open: (event, ui) => {
            const $input = $(event.target);
            const $results = $input.autocomplete("widget");
            const top = $results.position().top;
            const height = $results.height();
            const inputHeight = $input.height();
            const newTop = top - height - inputHeight;

            $results.css("top", `${newTop}px`);
        }
    });

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