    const rel2col = {
        'isGrandParentOf': '#a88ebe',
        'hasGrandParent': '#eda268',
        'isGreatGrandParentOf': '#d688aa',
        'hasGreatGrandParent': '#e77a68',

        'isUncleOf': '#e9ca7a',
        'hasUncle': '#c683ea',
        'isGreatUncleOf': '#e9ca7a',
        'hasGreatUncle': '#c683ea',
        'isAuntOf': '#e9ca7a',
        'hasAunt': '#c683ea',
        'isGreatAuntOf': '#e9ca7a',
        'hasGreatAunt': '#c683ea',

        'isBrotherOf': '#6da296',
        'isSisterOf': '#6da296',

        'isFirstCousinOf': '#6795fe',
        'isSecondCousinOf': '#6795fe',
        'isThirdCousinOf': '#6795fe'
    };

    let width = window.innerWidth;
    let height = window.innerHeight;

    const dragstarted = d => {
        d3.event.sourceEvent.stopPropagation();
        d3.select(`#c_${d.index}`).classed("fixed", d.fixed = true);
    }

    // const force = d3.layout.force()
    //         .nodes(d3.values(nodes)).links(edges)
    //         .linkDistance(80)
    //         .gravity(0.3)
    //         .charge(-1500)
    //         .start();


    const simulation = d3.forceSimulation()
        //.force('x',d3.forceX(function(d){return xScale(d.n);}))
        .force('y', d3.forceY(height))
        //.force('collide',d3.forceCollide(d => rScale(d.m)))

        .force("x", d3.forceX(width / 2).strength(0.4))
        // .force("y", d3.forceY(height / 2).strength(0.6))
        .force("charge", d3.forceManyBody().strength(-1500))
        .force("link", d3.forceLink().id(d => d.id))
        .force("collide", d3.forceCollide().radius(d => d.r * 500));
    //     .force("link", d3.forceLink().id(d => d.id))
    // .force("charge", d3.forceManyBody())
    // .force("center", d3.forceCenter(width / 2, height / 2));

    const resize = () => {
        console.log("window is being redrawn");

        width = window.innerWidth;
        height = window.innerHeight;

        simulation.force("center", d3.forceCenter(width / 2, height / 2));

        d3.select("svg")
          .attr("width", width)
          .attr("height", height);

        simulation.alpha(0.8).restart();
    }

    d3.select(window).on('resize', resize);

    const build_graph = (svg, data) => {

        const nuclearRelationshipTypes = new Set(['isWifeOf', 'isMotherOf', 'isFatherOf']);

        const otherRelationshipTypes = new Set([...nuclearRelationshipTypes, 'label']);
        const otherRelationships = data.filter(link => !otherRelationshipTypes.has(link.type)).reduce((accumulator, currentValue) => {
            if (currentValue.source !== currentValue.target) {
                if (accumulator[currentValue.source]) {
                    if (accumulator[currentValue.source][currentValue.type]) {
                        accumulator[currentValue.source][currentValue.type].push(currentValue.target);
                    }
                    else {
                        accumulator[currentValue.source][currentValue.type] = [currentValue.target];
                    }
                } else {
                    const o = {};
                    o[currentValue.type] = [currentValue.target];
                    accumulator[currentValue.source] = o;
                }
            }
            return accumulator;
        }, {});

        const rawEdges = data.filter(item => nuclearRelationshipTypes.has(item.type));
        const people =
            [...rawEdges.map(e => {
                return { id: e.source };
            }), ...rawEdges.map(e => {
                return { id: e.target };
            })].filter((person, index, self) => self.findIndex(p => p.id === person.id) === index);

        data.filter(item => item.type === 'label').forEach(currentValue => {
            const idx = people.findIndex(p => p.id === currentValue.source);
            if (idx !== -1) {
                people[idx] = Object.assign(people[idx], { label: currentValue.target });
            }
        });

        const edges = rawEdges.reduce((acc, e) => {
            const sourceIdx = people.findIndex(p => p.id === e.source);
            const targetIdx = people.findIndex(p => p.id === e.target);
            if (sourceIdx !== -1 && targetIdx !== -1) {
                acc.push(Object.assign({}, e, { source: people[sourceIdx], target: people[targetIdx] }));
            }
            return acc;
        }, []);

        simulation.force("link")
            .links(edges);

        simulation.nodes(people);

        const pathsLayer = svg.append("g")
            .attr("class", "links");
        const paths = pathsLayer.selectAll("line")
            .data(simulation.force("link").links())
            .enter().append("line")
            .attr("class", d => { return "edge " + d.type; })
            .attr("marker-end", d => { return "url(#" + d.type + ")"; });

        const cirlceLayer = svg.append("g")
            .attr("class", "nodes");
        const circles = cirlceLayer
            .selectAll("circle")
            .data(simulation.nodes())
            .enter().append("circle")
            .attr("r", d => {
                d.weight = edges.filter(l => l.source.id == d.id || l.target.id == d.id).length;
                const minRadius = 5;
                return minRadius + ((d.weight || 0) * 2);
            })
            .attr("id", d => `c_${d.index}`)
            .call(d3.drag()
                .on("start", dragstarted));

        const text = svg.append("g").selectAll("g")
            .data(simulation.nodes())
            .enter().append("g");

        text.append("text")
            .attr("x", -20)
            .attr("y", -10)
            .attr("class", "shadow")
            .attr("id", d => `s_${d.index}`)
            .text(d => { return d.label; });

        text.append("text")
            .attr("x", -20)
            .attr("y", -10)
            .attr("id", d => `t_${d.index}`)
            .text(d => { return d.label; });

        simulation.on("tick", () => {
            paths
                .attr("x1", d => {
                    return d.source.x;
                })
                .attr("y1", d => {
                    return d.source.y;
                })
                .attr("x2", d => {
                    return d.target.x;
                })
                .attr("y2", d => {
                    return d.target.y;
                });

            circles
                .attr("cx", d => {
                    return d.x;
                })
                .attr("cy", d => {
                    return d.y;
                });

            text
                .attr("transform", d => {
                    return `translate(${d.x},${d.y})`
                });
        });

        const handle = x => {
            d3.selectAll('circle').style('opacity', 0.25);
            d3.selectAll('text').style('opacity', 0.25);

            d3.select(`#c_${x.index}`)
                .style('stroke', 'black')
                .style('stroke-width', '2px')
                .style('opacity', 1);

            d3.select(`#t_${x.index}`)
                .style('font-weight', 'bolder')
                .style('font-size', 'larger')
                .style('opacity', 1);

            paths.style('stroke-width', l => {
                return (x.id === l.source.id || x.id === l.target.id) ? 2 : 1;
            });

            if (otherRelationships[x.id]) {
                let o = otherRelationships[x.id];
                for (const key in o) {
                    if (o.hasOwnProperty(key)) {
                        for (let i = 0; i < o[key].length; i++) {
                            let idx = people.findIndex(p => p.id === o[key][i]);
                            d3.select(`#c_${idx}`)
                                .style("fill", rel2col[key])
                                .style("opacity", 1);
                            d3.select(`#t_${idx}`)
                                .style("font-weight", "bolder")
                                .style('font-size', 'larger')
                                .style('opacity', 1);
                        }
                    }
                }
            }
        }

        const dehandle = x => {
            d3.select(`#c_${x.index}`)
                .style('stroke', '#999')
                .style('stroke-width', 1);
            paths.style('stroke-width', 1);
            d3.selectAll('text')
                .style("font-weight", "normal")
                .style("font-size", "medium") 
                .style('opacity', 1);
            d3.selectAll('circle')
                .style("fill", "#fff")
                .style('opacity', 1);
        }

        circles.on("mouseover", d => handle(d));
        text.on("mouseover", d => handle(d));
        circles.on("mouseout", d => dehandle(d));
        text.on("mouseout", d => dehandle(d));
    }

    const redraw = () => {
        svg.attr("transform", d3.event.transform);
    };

    const svg = d3.select("#family-tree-container")
        .append("svg")
        .attr('width', width)
        .attr('height', height)
        .call(d3.zoom().on("zoom", () => {
            svg.attr("transform", d3.event.transform);
        }))
        .append("g");

    // Per-type markers
    svg.append("defs").selectAll("marker")
        .data(["isMotherOf", "isFatherOf"])
        .enter().append("marker")
        .attr("id", d => { return d })
        .attr("viewBox", "0 0 40 20")
        .attr("refX", 55)
        .attr("refY", 10)
        .attr("markerWidth", 16)
        .attr("markerHeight", 12)
        .attr("orient", "auto")
        .append("polyline")
        .attr("points", "0,0 40,10 0,20 10,10");

    d3.json("data/nsp.json").then(data => {
        build_graph(svg, data);
    });


