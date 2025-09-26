"use strict";

// Register cytoscape extensions
if (typeof cytoscape !== "undefined" && typeof cytoscapeFcose !== "undefined") {
  cytoscape.use(cytoscapeFcose);
}
if (
  typeof cytoscape !== "undefined" &&
  typeof cytoscapeCoseBilkent !== "undefined"
) {
  cytoscape.use(cytoscapeCoseBilkent);
}
if (typeof cytoscape !== "undefined" && typeof cytoscapeEuler !== "undefined") {
  cytoscape.use(cytoscapeEuler);
}

const scaleBetween = (unscaledNum, minAllowed, maxAllowed, min, max) => {
  return (
    ((maxAllowed - minAllowed) * (unscaledNum - min)) / (max - min) + minAllowed
  );
};

const relType2Color = {
  isGrandParentOf: "#a88ebe", // grandchild
  hasGrandParent: "#eda268", // grandparent

  isGreatGrandParentOf: "#d688aa", // great-grandchild
  hasGreatGrandParent: "#e77a68", // great-grandparent

  isUncleOf: "#e9ca7a", //niece or nephew
  isGreatUncleOf: "#e9ca7a",
  isAuntOf: "#e9ca7a",
  isGreatAuntOf: "#e9ca7a",

  hasUncle: "#c683ea", // uncle or aunt
  hasGreatUncle: "#c683ea",
  hasAunt: "#c683ea",
  hasGreatAunt: "#c683ea",

  isBrotherOf: "#6da296", // sibling
  isSisterOf: "#6da296",
  isSiblingOf: "#6da296",

  isFirstCousinOf: "#6795fe", //cousin
  isSecondCousinOf: "#6795fe",
  isThirdCousinOf: "#6795fe",
};

const relType2Weight = {
  isGrandParentOf: 55,
  hasGrandParent: 50,

  isGreatGrandParentOf: 45, // great-grandchild
  hasGreatGrandParent: 40, // great-grandparent

  isUncleOf: 35, //niece or nephew
  isGreatUncleOf: 30,
  isAuntOf: 35,
  isGreatAuntOf: 30,

  hasUncle: 35, // uncle or aunt
  hasGreatUncle: 30,
  hasAunt: 35,
  hasGreatAunt: 30,

  isBrotherOf: 25, // sibling
  isSisterOf: 25,
  isSiblingOf: 20,

  isFirstCousinOf: 15,
  isSecondCousinOf: 10,
  isThirdCousinOf: 5,
};

let otherRelationships = {};

let cy = null;
let nodesArray = [];
let translations = {};
let locale = "en";

const searchNode = (selectedVal) => {
  const searchIndex = nodesArray.findIndex((n) => n.data().id === selectedVal);

  if (searchIndex !== -1) {
    highlightNetwork(nodesArray[searchIndex]);
    nodesArray[searchIndex].tippy.show();
  }
};

const highlightNetwork = (sel) => {
  cy.startBatch();
  cy.elements()
    .difference(sel.outgoers().union(sel.incomers()))
    .not(sel)
    .addClass("semitransp");

  const selId = sel.data().id;
  if (otherRelationships[selId]) {
    let o = otherRelationships[selId];
    for (const target in o) {
      let idx = nodesArray.findIndex((p) => p.data().id === target);
      if (idx !== -1) {
        let n = nodesArray[idx];
        n.removeClass("semitransp");
        n.addClass("highlight");
        n.style({ "background-color": relType2Color[o[target]] });
      }
    }
  }

  sel.addClass("root-highlight");
  sel.outgoers().union(sel.incomers()).addClass("highlight");
  cy.endBatch();
};

const resetNetwork = (sel) => {
  cy.startBatch();
  cy.elements().removeClass("semitransp highlight root-highlight");
  cy.nodes().style({ "background-color": "#fff" });
  cy.endBatch();
};

const resetButtonClickHandler = () => {
  $("#search").autocomplete("close").val("");
  resetNetwork();
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
    const xPos = left + width - 75;

    tooltipEl.css("top", yPos + "px");
    tooltipEl.css("left", xPos + "px");

    tooltipEl.fadeIn("fast");
  }
};

const fadeTooltip = (e) => {
  const el = e.target;
  const tooltipEl = $(el).find("div.list-item-tooltip");
  if (tooltipEl.length > 0) {
    tooltipEl.fadeOut("fast");
  }
};

const getQuery = () => {
  if (typeof window !== "undefined") {
    return new URLSearchParams(window.location.search);
  }
  return new URLSearchParams();
};

const getQueryStringValue = (key = null) => getQuery().get(key);

const getQueryParam = (key, defaultVal) =>
  getQueryStringValue(key) || defaultVal;

document.addEventListener("DOMContentLoaded", () => {
  locale = getQueryParam("locale", "en");
  translations = fetch("translations.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error(
          `Failed to load translations: ${res.status} ${res.statusText}`,
        );
      }
      return res.json();
    })
    .then((translations) => {
      if (!translations || !translations[locale]) {
        console.warn(
          `Translations not found for locale '${locale}', falling back to 'en'`,
        );
        locale = "en";
        if (!translations || !translations[locale]) {
          throw new Error("No translations available");
        }
      }
      const translate = (id, key) => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`Element with id '${id}' not found for translation`);
          return;
        }
        if (!translations[locale] || !translations[locale][key]) {
          console.warn(
            `Translation key '${key}' not found for locale '${locale}'`,
          );
          element.innerText = key; // Fallback to key name
          return;
        }
        element.innerText = translations[locale][key];
      };

      const localizeLegend = () => {
        translate("motherChildrenLink", "motherChildrenLinkTitle");
        translate("fatherChildrenLink", "fatherChildrenLinkTitle");
        translate("marriageLink", "marriageLinkTitle");
        translate("grandparent", "grandparentTitle");
        translate("greatGrandparent", "greatGrandparentTitle");
        translate("grandchild", "grandchildTitle");
        translate("greatGrandchild", "greatGrandchildTitle");
        translate("uncleOrAunt", "uncleOrAuntTitle");
        translate("newphewOrNiece", "newphewOrNieceTitle");
        translate("brotherOrSister", "brotherOrSisterTitle");
        translate("cousin", "cousinTitle");
      };

      const makePopper = (el) => {
        try {
          if (!el || !el.isNode || !el.isNode()) {
            return; // Skip non-nodes or invalid elements
          }

          // Check if element has valid data
          const nodeData = el.data();
          if (!nodeData || !nodeData.label) {
            console.warn("Skipping node with invalid data:", el.id());
            return;
          }

          // Create a dummy DOM element for positioning since popperRef() is problematic
          let dummyElement = document.createElement("div");
          dummyElement.style.position = "absolute";
          dummyElement.style.visibility = "hidden";
          dummyElement.style.pointerEvents = "none";
          document.body.appendChild(dummyElement);

          // Function to update dummy element position based on node position
          const updateDummyPosition = () => {
            try {
              const nodePosition = el.renderedPosition();
              const cyContainer = document.getElementById("cy");

              if (!nodePosition || !cyContainer || nodePosition.x === undefined || nodePosition.y === undefined) {
                console.warn("Invalid node position or container for tooltip:", el.id());
                return false;
              }

              const containerRect = cyContainer.getBoundingClientRect();

              // Validate container bounds
              if (containerRect.width === 0 || containerRect.height === 0) {
                console.warn("Invalid container bounds for tooltip:", el.id());
                return false;
              }

              // Calculate absolute position on page
              const absoluteX = containerRect.left + nodePosition.x + window.scrollX;
              const absoluteY = containerRect.top + nodePosition.y + window.scrollY;

              // Validate calculated position
              if (absoluteX < 0 || absoluteY < 0) {
                console.warn("Invalid calculated position for tooltip:", el.id(), { absoluteX, absoluteY });
                return false;
              }

              dummyElement.style.left = absoluteX + "px";
              dummyElement.style.top = absoluteY + "px";
              return true;
            } catch (error) {
              console.error("Error updating dummy position for tooltip:", el.id(), error);
              return false;
            }
          };

          // Initial position update
          updateDummyPosition();

          // Track if tooltip was clicked to make it persistent
          let isClickedTooltip = false;

          el.tippy = tippy(dummyElement, {
            // tippy options:
            theme: "normanblue",
            offset: [0, 15],
            zIndex: 3000,
            placement: "bottom",
            flip: true, // Allow flipping to stay in viewport
            flipBehavior: ["bottom", "top", "right", "left"], // Try multiple positions
            boundary: "viewport", // Keep within viewport
            interactive: true, // Allow interaction with tooltip content
            hideOnClick: false,
            maxWidth: Math.min(400, window.innerWidth * 0.8), // Limit width to prevent overflow
            onShow: (instance) => {
              // Only show if positioning is valid
              if (!updateDummyPosition()) {
                return false; // Prevent showing if positioning failed
              }

              // Get current node and viewport positions
              const nodePosition = el.renderedPosition();
              const cyContainer = document.getElementById("cy");
              const containerRect = cyContainer.getBoundingClientRect();

              if (!nodePosition || !containerRect) return;

              // Calculate node position relative to viewport
              const nodeViewportX = containerRect.left + nodePosition.x;
              const nodeViewportY = containerRect.top + nodePosition.y;

              const viewportHeight = window.innerHeight;
              const viewportWidth = window.innerWidth;

              // Smart placement based on available space
              let placement = "bottom";

              // Check vertical space
              const spaceBelow = viewportHeight - nodeViewportY;
              const spaceAbove = nodeViewportY;

              if (spaceBelow < 200 && spaceAbove > spaceBelow) {
                placement = "top";
              }

              // Check horizontal space and adjust
              if (nodeViewportX > viewportWidth * 0.75) {
                placement = placement === "top" ? "top-start" : "bottom-start";
              } else if (nodeViewportX < viewportWidth * 0.25) {
                placement = placement === "top" ? "top-end" : "bottom-end";
              }

              instance.setProps({
                placement,
                maxWidth: Math.min(400, Math.max(300, viewportWidth * 0.6)) // Dynamic max width
              });
            },
            onHidden: () => {
              // Clean up dummy element when tooltip is hidden
              if (dummyElement && dummyElement.parentNode) {
                dummyElement.parentNode.removeChild(dummyElement);
              }
            },
            content: () => {
              let content = document.createElement("div");

              let allTitles = [].concat(
                el.data().honorificPrefixes,
                el.data().honorificSuffixes,
              );

              let titles =
                allTitles.length > 0
                  ? `<tr><td>${allTitles.length > 1 ? `${translations[locale]["titlesFieldTitle"]}` : `${translations[locale]["titleFieldTitle"]}`}</td><td>${allTitles.reduce(
                      (accum, title, index, titles) => {
                        return (
                          accum +
                          (titles.length > 1 && index + 1 === titles.length
                            ? ` ${translations[locale]["andText"]} `
                            : ", ") +
                          title
                        );
                      },
                    )}</td></tr>`
                  : "";

              let alternateNames =
                el.data().alternateNames.length > 0
                  ? `<tr><td>Alternate ${el.data().alternateNames.length > 1 ? `${translations[locale]["spellingsFieldTitle"]}` : `${translations[locale]["spellingFieldTitle"]}`}</td><td>${el
                      .data()
                      .alternateNames.reduce((accum, name, index, names) => {
                        return (
                          accum +
                          (names.length > 1 && index + 1 === names.length
                            ? ` ${translations[locale]["orText"]} `
                            : ", ") +
                          name
                        );
                      })}</td></tr>`
                  : "";

              let images =
                el.data().images.length > 0
                  ? `<tr><td>${el.data().images.length > 1 ? `${translations[locale]["imagesFieldTitle"]}` : `${translations[locale]["imageFieldTitle"]}`}</td><td>${el
                      .data()
                      .images.reduce((accum, image) => {
                        return (accum =
                          accum +
                          `<div class="person-image-container"><img class="person-image" src="data/${image}"></div>`);
                      }, "")}</td></tr>`
                  : "";

              let birthDate =
                el.data().birthDate && el.data().birthDate.length > 0
                  ? `<tr><td>${translations[locale]["birthDateFieldTitle"]}</td><td>${el.data().birthDate}</td></tr>`
                  : "";

              let birthPlace =
                el.data().birthPlace && el.data().birthPlace.length > 0
                  ? `<tr><td>${translations[locale]["birthPlaceFieldTitle"]}</td><td>${el.data().birthPlace}</td></tr>`
                  : "";

              let deathDate =
                el.data().deathDate && el.data().deathDate.length > 0
                  ? `<tr><td>${translations[locale]["deathDateFieldTitle"]}</td><td>${el.data().deathDate}</td></tr>`
                  : "";

              let deathPlace =
                el.data().deathPlace && el.data().deathPlace.length > 0
                  ? `<tr><td>${translations[locale]["deathPlaceFieldTitle"]}</td><td>${el.data().deathPlace}</td></tr>`
                  : "";

              content.innerHTML = `
                                <div class='label' style='font-weight: bold; margin-bottom: 8px; font-size: 14px;'>${el.data().label}</div>
                                <div style='max-height: 300px; overflow-y: auto; font-size: 12px;'>
                                  <table style='width: 100%; font-size: 12px;'><tbody>
                                      ${alternateNames}
                                      ${birthDate}
                                      ${birthPlace}
                                      ${deathDate}
                                      ${deathPlace}
                                      ${titles}
                                      ${images}
                                  </tbody></table>
                                </div>
                            `;

              return content;
            },
            trigger: "manual", // manual mode for precise control
            arrow: true,
            appendTo: document.body, // Ensure tooltip appears above all elements
          });

          // Update position on pan/zoom
          cy.on("pan zoom", () => {
            if (el.tippy && el.tippy.state.isVisible) {
              updateDummyPosition();
            }
          });
        } catch (error) {
          console.error("Error creating popper for node:", el.id(), error);
        }
      };

      if (translations[locale] && translations[locale]["pageTitle"]) {
        document.title = translations[locale]["pageTitle"];
      } else {
        console.warn("Page title translation not found");
      }

      localizeLegend();
      translate("searchLabel", "searchFieldTitle");
      const searchElement = document.getElementById("search");
      if (searchElement) {
        searchElement.placeholder =
          translations[locale] && translations[locale]["searchFieldPlaceholder"]
            ? translations[locale]["searchFieldPlaceholder"]
            : "Search for a person...";
      } else {
        console.warn("Search element not found");
      }
      translate("reset", "resetButtonCaption");
      translate("helpText", "helpTextCaption");

      let optArray = [];

      try {
        const cyContainer = document.getElementById("cy");
        if (!cyContainer) {
          throw new Error("Cytoscape container element not found");
        }
        cy = cytoscape({
          container: cyContainer,
          autounselectify: true,
          boxSelectionEnabled: false,
          layout: {
            name: "fcose",
            // Disable animation for faster layout
            animate: false,
            // Fit the layout to the viewport
            fit: true,
            // Padding around the graph
            padding: 30,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 100, // Much longer edges for spacing
            randomize: true, // Start with random positions
            stop: () => {
              const loading = document.getElementById("loading");
              loading.classList.add("loaded");
            },
          },
          style: [
            {
              selector: "node",
              style: {
                label: "data(label)",
                color: "#000",
                "background-color": "#fff",
                "border-color": "#000",
                "border-width": "1px",
                "border-style": "solid",
                "font-family": '"Libre Baskerville", serif',
                "text-opacity": 0.8,
                "text-valign": "bottom", // Move text below nodes
                "text-halign": "center",
                "text-wrap": "wrap",
                "text-max-width": "120px", // Increased width
                "font-size": "10px", // Smaller font
                "text-margin-y": 8, // Add margin below node
                width: "data(size)",
                height: "data(size)",
              },
            },
            {
              selector: 'edge[type = \"isFatherOf\"]',
              style: {
                "line-color": "#6f93ad",
                "mid-target-arrow-color": "#6f93ad",
                "mid-target-arrow-shape": "triangle",
                "mid-target-arrow-fill": "filled",
              },
            },
            {
              selector: 'edge[type = \"isMotherOf\"]',
              style: {
                "line-color": "#ff76b8",
                "mid-target-arrow-color": "#ff76b8",
                "mid-target-arrow-shape": "triangle",
                "mid-target-arrow-fill": "filled",
              },
            },
            {
              selector: 'edge[type = \"isWifeOf\"]',
              style: {
                "line-color": "#73a567",
              },
            },
            {
              selector: 'edge[type = \"isHusbandOf\"]',
              style: {
                "line-color": "#73a567",
              },
            },
            {
              selector: 'edge[type = \"isSpouseOf\"]',
              style: {
                "line-color": "#73a567",
              },
            },
            {
              selector: "node.highlight",
              style: {
                "border-width": "3px",
                "text-opacity": "1",
              },
            },
            {
              selector: "node.root-highlight",
              style: {
                "border-width": "6px",
                "text-opacity": "1",
                "background-fill": "linear-gradient",
                "background-gradient-stop-colors": "yellow gold orange",
              },
            },
            {
              selector: "node.semitransp",
              style: { opacity: "0.2" },
            },
            {
              selector: "edge.semitransp",
              style: { opacity: "0.1" },
            },
          ],
          elements: fetch("data/nsp_people.json")
            .then((res) => {
              if (!res.ok) {
                throw new Error(
                  `Failed to load family data: ${res.status} ${res.statusText}`,
                );
              }
              return res.json();
            })
            .then((graph) => {
              if (!graph || !graph.nodes || !graph.edges) {
                throw new Error(
                  "Invalid family data format: missing nodes or edges",
                );
              }

              // Efficient degree-based filtering for large networks
              const originalNodeCount = graph.nodes.length;

              if (originalNodeCount > 500) {
                console.log(
                  `Large network detected (${originalNodeCount} nodes). Filtering to most connected clan members.`,
                );

                // Calculate degrees from edges first
                const degreeMap = new Map();
                graph.nodes.forEach((node) => degreeMap.set(node.data.id, 0));

                // Count connections for each node
                graph.edges.forEach((edge) => {
                  degreeMap.set(
                    edge.data.source,
                    (degreeMap.get(edge.data.source) || 0) + 1,
                  );
                  degreeMap.set(
                    edge.data.target,
                    (degreeMap.get(edge.data.target) || 0) + 1,
                  );
                });

                // Get top 50 nodes by degree
                const topNodes = [...degreeMap.entries()]
                  .sort((a, b) => b[1] - a[1]) // Sort by degree descending
                  .slice(0, 50) // Take top 50
                  .map((entry) => entry[0]); // Extract node IDs

                console.log(
                  `Selected top ${topNodes.length} most connected nodes`,
                );

                // Create a Set for fast lookup
                const topNodeSet = new Set(topNodes);

                // Add nodes connected to top nodes (1-hop expansion)
                const connectedNodeIds = new Set(topNodes);
                for (const edge of graph.edges) {
                  if (topNodeSet.has(edge.data.source)) {
                    connectedNodeIds.add(edge.data.target);
                  }
                  if (topNodeSet.has(edge.data.target)) {
                    connectedNodeIds.add(edge.data.source);
                  }
                }

                // Filter to keep only connected nodes and their edges
                graph.nodes = graph.nodes.filter((node) =>
                  connectedNodeIds.has(node.data.id),
                );
                graph.edges = graph.edges.filter(
                  (edge) =>
                    connectedNodeIds.has(edge.data.source) &&
                    connectedNodeIds.has(edge.data.target),
                );

                console.log(
                  `Filtered network: ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
                );
              }

              // Calculate the maximum node size to adjust layout parameters
              const maxNodeSize = Math.max(
                ...graph.nodes.map((n) => n.data.size || 50),
              );
              const avgNodeSize =
                graph.nodes.reduce((sum, n) => sum + (n.data.size || 50), 0) /
                graph.nodes.length;

              console.log(
                `Node sizes - max: ${maxNodeSize}, avg: ${avgNodeSize}`,
              );

              // Let fcose handle the clan clustering with aggressive spacing parameters
              console.log(
                `Using fcose layout with aggressive spacing for ${graph.nodes.length} nodes`,
              );

              // Calculate node sizes BEFORE layout (this was happening after!)
              const nuclearRelationshipTypes = new Set([
                "isWifeOf",
                "isMotherOf",
                "isFatherOf",
                "isHusbandOf",
                "isSpouseOf",
              ]);
              const edges = graph.edges.filter((e) =>
                nuclearRelationshipTypes.has(e.data.type),
              );

              // Calculate degrees first
              const edgesSize = edges.length;
              for (let i = 0; i < edgesSize; ++i) {
                const e = edges[i];
                let sourceIndex = graph.nodes.findIndex(
                  (p) => p.data.id === e.data.source,
                );
                if (sourceIndex !== -1) {
                  graph.nodes[sourceIndex].data.degree += 1;
                }
                let targetIndex = graph.nodes.findIndex(
                  (p) => p.data.id === e.data.target,
                );
                if (targetIndex !== -1) {
                  graph.nodes[targetIndex].data.degree += 1;
                }
              }

              // Calculate node sizes based on degrees
              const max = Math.max.apply(
                Math,
                graph.nodes.map((n) => n.data.degree || 0),
              );
              const min = Math.min.apply(
                Math,
                graph.nodes.map((n) => n.data.degree || 0),
              );

              const scaledMin = 10;
              const scaledMax = 100;
              const nodesSize = graph.nodes.length;

              for (let i = 0; i < nodesSize; ++i) {
                graph.nodes[i].data.size = scaleBetween(
                  graph.nodes[i].data.degree || 0,
                  scaledMin,
                  scaledMax,
                  min,
                  max,
                );
              }

              console.log("Node sizes calculated BEFORE layout");

              // Graph is already modified in place above

              otherRelationships = graph.edges
                .filter((e) => !nuclearRelationshipTypes.has(e.data.type))
                .reduce((a, e) => {
                  if (e.data.source !== e.data.target) {
                    if (a[e.data.source]) {
                      if (a[e.data.source][e.data.target]) {
                        a[e.data.source][e.data.target] =
                          relType2Weight[a[e.data.source][e.data.target]] >
                          relType2Weight[e.data.type]
                            ? a[e.data.source][e.data.target]
                            : e.data.type;
                      } else {
                        a[e.data.source][e.data.target] = e.data.type;
                      }
                    } else {
                      const o = {};
                      o[e.data.target] = e.data.type;
                      a[e.data.source] = o;
                    }
                  }
                  return a;
                }, {});

              const nodeSize = graph.nodes.length;

              for (let i = 0; i < nodeSize; ++i) {
                let alternateNames =
                  graph.nodes[i].data.alternateNames.length > 0
                    ? `(${graph.nodes[i].data.alternateNames.reduce(
                        (accum, name, index, names) => {
                          return (
                            accum +
                            (names.length > 1 && index + 1 === names.length
                              ? ` ${translations[locale]["orText"]} `
                              : ", ") +
                            name
                          );
                        },
                      )})`
                    : "";

                let allTitles = [].concat(
                  graph.nodes[i].data.honorificPrefixes,
                  graph.nodes[i].data.honorificSuffixes,
                );

                let allTitlesStr =
                  allTitles.length > 0
                    ? `${allTitles.reduce((accum, title, index, titles) => {
                        return (
                          accum +
                          (titles.length > 1 && index + 1 === titles.length
                            ? ` ${translations[locale]["andText"]} `
                            : ", ") +
                          title
                        );
                      })}`
                    : "";

                let birthDate =
                  graph.nodes[i].data.birthDate &&
                  graph.nodes[i].data.birthDate.length > 0
                    ? `${translations[locale]["birthDateLeader"]} ${graph.nodes[i].data.birthDate}`
                    : undefined;

                let birthPlace =
                  graph.nodes[i].data.birthPlace &&
                  graph.nodes[i].data.birthPlace.length > 0
                    ? `${graph.nodes[i].data.birthPlace}`
                    : undefined;

                let deathDate =
                  graph.nodes[i].data.deathDate &&
                  graph.nodes[i].data.deathDate.length > 0
                    ? `${translations[locale]["deathDateLeader"]} ${graph.nodes[i].data.deathDate}`
                    : undefined;

                let deathPlace =
                  graph.nodes[i].data.deathPlace &&
                  graph.nodes[i].data.deathPlace.length > 0
                    ? `${graph.nodes[i].data.deathPlace}`
                    : undefined;

                let tooltipData = `${[[birthDate, birthPlace].filter(Boolean).join(" at "), [deathDate, deathPlace].filter(Boolean).join(" at "), allTitlesStr].filter(Boolean).join("; ")}`;

                optArray.push({
                  label: graph.nodes[i].data.label,
                  value: graph.nodes[i].data.id,
                  desc: alternateNames,
                  tooltipData,
                });
              }

              graph.edges = Object.assign([], edges);

              // Filter out isolated nodes (nodes with no connections)
              const connectedNodeIds = new Set();
              graph.edges.forEach((edge) => {
                connectedNodeIds.add(edge.data.source);
                connectedNodeIds.add(edge.data.target);
              });

              const preFilterNodeCount = graph.nodes.length;
              graph.nodes = graph.nodes.filter((node) =>
                connectedNodeIds.has(node.data.id),
              );
              const postFilterNodeCount = graph.nodes.length;

              if (preFilterNodeCount > postFilterNodeCount) {
                console.log(
                  `Removed ${preFilterNodeCount - postFilterNodeCount} isolated nodes`,
                );
              }

              return graph;
            })
            .then((graph) => {
              // Node sizes already calculated before layout - no need to duplicate
              console.log("Skipping duplicate size calculation");
              return graph;
            })
            .catch((error) => {
              console.error("Error loading family data:", error);
              const loading = document.getElementById("loading");
              if (loading) {
                loading.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #d32f2f;">
                  <h3>Error Loading Family Tree</h3>
                  <p>${error.message}</p>
                  <p>Please check that the data file exists and is properly formatted.</p>
                </div>
              `;
                loading.classList.add("loaded");
              }
              return { nodes: [], edges: [] }; // Return empty data to prevent further errors
            }),
        });
      } catch (error) {
        console.error("Error initializing Cytoscape:", error);
        const loading = document.getElementById("loading");
        if (loading) {
          loading.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #d32f2f;">
              <h3>Error Initializing Visualization</h3>
              <p>${error.message}</p>
              <p>Your browser may not support the required features.</p>
            </div>
          `;
          loading.classList.add("loaded");
        }
        return;
      }

      if (cy) {
        cy.on("click", "node", (e) => {
          try {
            highlightNetwork(e.target);

            // Clear any previously clicked tooltips
            cy.nodes().forEach((node) => {
              if (node._tooltipClicked && node !== e.target) {
                node._tooltipClicked = false;
                if (node.tippy) {
                  node.tippy.hide();
                }
              }
            });

            // Mark this tooltip as clicked and show it
            if (e.target.tippy) {
              e.target._tooltipClicked = true;
              e.target.tippy.show();
            }
          } catch (error) {
            console.error("Error handling node click:", error);
          }
        });

        // Add mouseover and mouseout events for tooltips and network highlighting
        cy.on("mouseover", "node", (e) => {
          try {
            highlightNetwork(e.target);
            if (e.target.tippy && !e.target._tooltipClicked) {
              e.target.tippy.show();
            }
          } catch (error) {
            console.error("Error handling node mouseover:", error);
          }
        });

        cy.on("mouseout", "node", (e) => {
          try {
            resetNetwork();
            // Only hide tooltip on mouseout if it wasn't clicked
            if (e.target.tippy && !e.target._tooltipClicked) {
              e.target.tippy.hide();
            }
          } catch (error) {
            console.error("Error handling node mouseout:", error);
          }
        });

        // Close tooltip when clicking elsewhere
        cy.on("click", (e) => {
          if (e.target === cy) {
            cy.nodes().forEach((node) => {
              if (node.tippy) {
                node._tooltipClicked = false;
                node.tippy.hide();
              }
            });
            resetNetwork();
          }
        });
      }

      if (cy) {
        cy.on("ready", (e) => {
          try {
            nodesArray = cy.nodes().toArray();
            cy.elements().forEach((el) => {
              makePopper(el);
            });
          } catch (error) {
            console.error("Error in cytoscape ready handler:", error);
          }
        });
      }

      if (cy) {
        try {
          cy.panzoom({
            // options here...
          });

          // Advanced zoom-based label display with better thresholds
          cy.on("zoom", () => {
            const zoom = cy.zoom();
            const nodes = cy.nodes();

            // Calculate node importance score (size + degree)
            const getNodeImportance = (node) => {
              const size = node.data("size") || 50;
              const degree = node.data("degree") || 0;
              return size + degree * 2; // Weight degree higher
            };

            if (zoom > 1.5) {
              // Very zoomed in - show all labels
              nodes.forEach((node) => {
                const originalLabel = node.data("label");
                if (originalLabel) {
                  node.style("label", originalLabel);
                  node.style("text-opacity", 0.9);
                }
              });
            } else if (zoom > 1.0) {
              // Medium zoom in - show top 60% most important
              const sortedNodes = nodes.sort(
                (a, b) => getNodeImportance(b) - getNodeImportance(a),
              );
              const showCount = Math.floor(nodes.length * 0.6);

              nodes.forEach((node, index) => {
                const nodeIndex = sortedNodes.indexOf(node);
                const originalLabel = node.data("label");

                if (originalLabel && nodeIndex < showCount) {
                  node.style("label", originalLabel);
                  node.style("text-opacity", 0.8);
                } else {
                  node.style("label", "");
                  node.style("text-opacity", 0);
                }
              });
            } else if (zoom > 0.6) {
              // Normal zoom - show top 30% most important
              const sortedNodes = nodes.sort(
                (a, b) => getNodeImportance(b) - getNodeImportance(a),
              );
              const showCount = Math.floor(nodes.length * 0.3);

              nodes.forEach((node, index) => {
                const nodeIndex = sortedNodes.indexOf(node);
                const originalLabel = node.data("label");

                if (originalLabel && nodeIndex < showCount) {
                  node.style("label", originalLabel);
                  node.style("text-opacity", 0.8);
                } else {
                  node.style("label", "");
                  node.style("text-opacity", 0);
                }
              });
            } else {
              // Zoomed out - show only top 10% most important (clan leaders)
              const sortedNodes = nodes.sort(
                (a, b) => getNodeImportance(b) - getNodeImportance(a),
              );
              const showCount = Math.max(5, Math.floor(nodes.length * 0.1)); // At least 5 labels

              nodes.forEach((node, index) => {
                const nodeIndex = sortedNodes.indexOf(node);
                const originalLabel = node.data("label");

                if (originalLabel && nodeIndex < showCount) {
                  node.style("label", originalLabel);
                  node.style("text-opacity", 0.9);
                } else {
                  node.style("label", "");
                  node.style("text-opacity", 0);
                }
              });
            }
          });
        } catch (error) {
          console.error("Error initializing pan/zoom:", error);
        }
      }

      optArray = optArray.sort();

      const searchElementJQ = $("#search");
      if (searchElementJQ.length > 0) {
        try {
          searchElementJQ.autocomplete({
            minLength: 0,
            source: optArray,
            position: {
              my: "left bottom",
              at: "left top",
              of: $("#search"),
              collision: "flip flip",
            },
            focus: (event, ui) => {
              $("#search").val(ui.item.label);
              return false;
            },
            select: (event, ui) => {
              $("#search").val(ui.item.label);
              resetNetwork();
              searchNode(ui.item.value);
              return false;
            },
            open: (event, ui) => {
              $("div.list-item").on("mouseover", positionTooltip);
              $("div.list-item").on("mouseout", fadeTooltip);
            },
            close: (event, ui) => {
              $("div.list-item").off("mouseover", positionTooltip);
              $("div.list-item").off("mouseout", fadeTooltip);
            },
          });

          if (searchElementJQ.autocomplete("instance")) {
            searchElementJQ.autocomplete("instance")._renderItem = (
              ul,
              item,
            ) => {
              return $("<li>")
                .append(
                  `
                <div class="list-item" id="${item.value}">
                    ${item.label}${item.tooltipData.length > 0 ? "*" : ""}
                    <div class="list-item-description">${item.desc}</div>
                    ${item.tooltipData.length > 0 ? `<div class="list-item-tooltip">${item.tooltipData}</div>` : ""}  
                </div>`,
                )
                .appendTo(ul);
            };
          }
        } catch (error) {
          console.error("Error initializing search autocomplete:", error);
        }
      } else {
        console.warn(
          "Search element not found for autocomplete initialization",
        );
      }

      const resetButton = $("#reset");
      if (resetButton.length > 0) {
        resetButton.click(() => {
          try {
            resetButtonClickHandler();
          } catch (error) {
            console.error("Error handling reset button click:", error);
          }
        });
      } else {
        console.warn("Reset button not found");
      }

      window.onkeydown = (e) => {
        try {
          const keyCode = e.key || e.keyIdentifier || e.keyCode;
          if (keyCode === 27 || keyCode === "Escape") {
            resetButtonClickHandler();
          }
        } catch (error) {
          console.error("Error handling keydown event:", error);
        }
      };
    })
    .catch((error) => {
      console.error("Error initializing application:", error);
      const loading = document.getElementById("loading");
      if (loading) {
        loading.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #d32f2f;">
            <h3>Error Loading Application</h3>
            <p>${error.message}</p>
            <p>Please refresh the page or check your internet connection.</p>
          </div>
        `;
        loading.classList.add("loaded");
      }
    });
});
