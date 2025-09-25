"use strict";

// Register cytoscape extensions
if (typeof cytoscape !== 'undefined' && typeof cytoscapeFcose !== 'undefined') {
  cytoscape.use(cytoscapeFcose);
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
        throw new Error(`Failed to load translations: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then((translations) => {
      if (!translations || !translations[locale]) {
        console.warn(`Translations not found for locale '${locale}', falling back to 'en'`);
        locale = 'en';
        if (!translations || !translations[locale]) {
          throw new Error('No translations available');
        }
      }
      const translate = (id, key) => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`Element with id '${id}' not found for translation`);
          return;
        }
        if (!translations[locale] || !translations[locale][key]) {
          console.warn(`Translation key '${key}' not found for locale '${locale}'`);
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
            console.warn('Skipping node with invalid data:', el.id());
            return;
          }

          let ref = el.popperRef(); // used only for positioning
          if (!ref) {
            console.warn('No popper reference for node:', el.id());
            return;
          }

          el.tippy = tippy(ref, {
            // tippy options:
            theme: "normanblue",
            offset: "250,250",
            zIndex: 3000,
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
            trigger: "manual", // probably want manual mode
            arrow: true,
            placement: "bottom",
          });
        } catch (error) {
          console.error('Error creating popper for node:', el.id(), error);
        }
      };

      if (translations[locale] && translations[locale]["pageTitle"]) {
        document.title = translations[locale]["pageTitle"];
      } else {
        console.warn('Page title translation not found');
      }

      localizeLegend();
      translate("searchLabel", "searchFieldTitle");
      const searchElement = document.getElementById("search");
      if (searchElement) {
        searchElement.placeholder = translations[locale] && translations[locale]["searchFieldPlaceholder"]
          ? translations[locale]["searchFieldPlaceholder"]
          : "Search for a person...";
      } else {
        console.warn('Search element not found');
      }
      translate("reset", "resetButtonCaption");
      translate("helpText", "helpTextCaption");

      let optArray = [];

      try {
        const cyContainer = document.getElementById('cy');
        if (!cyContainer) {
          throw new Error('Cytoscape container element not found');
        }
        cy = cytoscape({
          container: cyContainer,
        autounselectify: true,
        boxSelectionEnabled: false,
        layout: {
          name: "fcose",
          nodeDimensionsIncludeLabels: true,
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
              "text-opacity": 0.5,
              "text-valign": "top",
              "text-halign": "center",
              "text-wrap": "wrap",
              "text-max-width": "100px",
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
              throw new Error(`Failed to load family data: ${res.status} ${res.statusText}`);
            }
            return res.json();
          })
          .then((graph) => {
            if (!graph || !graph.nodes || !graph.edges) {
              throw new Error('Invalid family data format: missing nodes or edges');
            }
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
            graph.edges.forEach(edge => {
              connectedNodeIds.add(edge.data.source);
              connectedNodeIds.add(edge.data.target);
            });

            const originalNodeCount = graph.nodes.length;
            graph.nodes = graph.nodes.filter(node => connectedNodeIds.has(node.data.id));
            const filteredNodeCount = graph.nodes.length;

            if (originalNodeCount > filteredNodeCount) {
              console.log(`Removed ${originalNodeCount - filteredNodeCount} isolated nodes`);
            }

            return graph;
          })
          .then((graph) => {
            const edgesSize = graph.edges.length;
            for (let i = 0; i < edgesSize; ++i) {
              const e = graph.edges[i];
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

            const max = Math.max.apply(
              Math,
              graph.nodes.map((n) => n.data.degree),
            );
            const min = Math.min.apply(
              Math,
              graph.nodes.map((n) => n.data.degree),
            );

            const scaledMin = 10;
            const scaledMax = 100;

            const nodesSize = graph.nodes.length;

            for (let i = 0; i < nodesSize; ++i) {
              graph.nodes[i].data.size = scaleBetween(
                graph.nodes[i].data.degree,
                scaledMin,
                scaledMax,
                min,
                max,
              );
            }

            return graph;
          })
          .catch((error) => {
            console.error('Error loading family data:', error);
            const loading = document.getElementById('loading');
            if (loading) {
              loading.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #d32f2f;">
                  <h3>Error Loading Family Tree</h3>
                  <p>${error.message}</p>
                  <p>Please check that the data file exists and is properly formatted.</p>
                </div>
              `;
              loading.classList.add('loaded');
            }
            return { nodes: [], edges: [] }; // Return empty data to prevent further errors
          }),
        });
      } catch (error) {
        console.error('Error initializing Cytoscape:', error);
        const loading = document.getElementById('loading');
        if (loading) {
          loading.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #d32f2f;">
              <h3>Error Initializing Visualization</h3>
              <p>${error.message}</p>
              <p>Your browser may not support the required features.</p>
            </div>
          `;
          loading.classList.add('loaded');
        }
        return;
      }

      if (cy) {
        cy.on("click", "node", (e) => {
          try {
            highlightNetwork(e.target);
            if (e.target.tippy) {
              e.target.tippy.show();
            }
          } catch (error) {
            console.error('Error handling node click:', error);
          }
        });

        // Close tooltip when clicking elsewhere
        cy.on("click", (e) => {
          if (e.target === cy) {
            cy.nodes().forEach(node => {
              if (node.tippy) {
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
            console.error('Error in cytoscape ready handler:', error);
          }
        });
      }

      if (cy) {
        try {
          cy.panzoom({
            // options here...
          });
        } catch (error) {
          console.error('Error initializing pan/zoom:', error);
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
            searchElementJQ.autocomplete("instance")._renderItem = (ul, item) => {
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
          console.error('Error initializing search autocomplete:', error);
        }
      } else {
        console.warn('Search element not found for autocomplete initialization');
      }

      const resetButton = $("#reset");
      if (resetButton.length > 0) {
        resetButton.click(() => {
          try {
            resetButtonClickHandler();
          } catch (error) {
            console.error('Error handling reset button click:', error);
          }
        });
      } else {
        console.warn('Reset button not found');
      }

      window.onkeydown = (e) => {
        try {
          const keyCode = e.key || e.keyIdentifier || e.keyCode;
          if (keyCode === 27 || keyCode === "Escape") {
            resetButtonClickHandler();
          }
        } catch (error) {
          console.error('Error handling keydown event:', error);
        }
      };
    })
    .catch((error) => {
      console.error('Error initializing application:', error);
      const loading = document.getElementById('loading');
      if (loading) {
        loading.innerHTML = `
          <div style="text-align: center; padding: 20px; color: #d32f2f;">
            <h3>Error Loading Application</h3>
            <p>${error.message}</p>
            <p>Please refresh the page or check your internet connection.</p>
          </div>
        `;
        loading.classList.add('loaded');
      }
    });
});

