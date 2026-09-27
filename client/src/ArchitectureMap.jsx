import { useEffect, useState } from "react";
import axios from "axios";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

function ArchitectureMap({ repositoryId }) {
  const [nodes, setNodes, onNodesChange] =
    useNodesState([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadArchitecture = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `http://localhost:5000/api/repositories/${repositoryId}/architecture`
        );

        const architecture = response.data;

        // --------------------------------
        // Build dependency levels
        // --------------------------------

        const nodeIds = architecture.nodes.map(
          (node) => node.id
        );

        const incomingCount = {};

        nodeIds.forEach((id) => {
          incomingCount[id] = 0;
        });

        architecture.edges.forEach((edge) => {
          if (incomingCount[edge.target] !== undefined) {
            incomingCount[edge.target]++;
          }
        });

        // Nodes with no incoming dependencies
        let currentLevel = nodeIds.filter(
          (id) => incomingCount[id] === 0
        );

        const levels = [];
        const visited = new Set();

        while (currentLevel.length > 0) {
          levels.push(currentLevel);

          currentLevel.forEach((id) => {
            visited.add(id);
          });

          const nextLevel = [];

          architecture.edges.forEach((edge) => {
            if (
              visited.has(edge.source) &&
              !visited.has(edge.target)
            ) {
              const targetHasUnvisitedDependencies =
                architecture.edges.some(
                  (otherEdge) =>
                    otherEdge.target === edge.target &&
                    !visited.has(otherEdge.source)
                );

              if (
                !targetHasUnvisitedDependencies &&
                !nextLevel.includes(edge.target)
              ) {
                nextLevel.push(edge.target);
              }
            }
          });

          currentLevel = nextLevel;
        }

        // Handle nodes that are part of cycles
        // or were not reached by the dependency graph.
        const remainingNodes = nodeIds.filter(
          (id) => !visited.has(id)
        );

        if (remainingNodes.length > 0) {
          levels.push(remainingNodes);
        }

        // --------------------------------
        // Create positions
        // --------------------------------

        const positionMap = {};

        levels.forEach((level, levelIndex) => {
          const levelWidth =
            level.length * 240;

          const startX =
            Math.max(
              50,
              (1200 - levelWidth) / 2
            );

          level.forEach(
            (nodeId, nodeIndex) => {
              positionMap[nodeId] = {
                x:
                  startX +
                  nodeIndex * 240,

                y:
                  levelIndex * 150 + 50,
              };
            }
          );
        });

        // --------------------------------
        // Create React Flow nodes
        // --------------------------------

        const flowNodes =
          architecture.nodes.map(
            (node) => ({
              id: node.id,

              position:
                positionMap[node.id] || {
                  x: 100,
                  y: 100,
                },

              data: {
                label: node.label,
              },

              style: {
                background: "#111827",
                color: "#60a5fa",
                border:
                  "1px solid #2563eb",
                borderRadius: "8px",
                padding: "10px",
                width: 190,
                fontSize: "12px",
                textAlign: "center",
              },
            })
          );

        setNodes(flowNodes);

        // --------------------------------
        // Create React Flow edges
        // --------------------------------

        const flowEdges =
          architecture.edges.map(
            (edge, index) => ({
              id: `edge-${index}`,

              source: edge.source,

              target: edge.target,

              animated: true,

              style: {
                stroke: "#60a5fa",
                strokeWidth: 1.5,
              },
            })
          );

        setEdges(flowEdges);

      } catch (error) {
        console.error(
          "Architecture loading failed:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Failed to load architecture"
        );
      } finally {
        setLoading(false);
      }
    };

    if (repositoryId) {
      loadArchitecture();
    }
  }, [
    repositoryId,
    setNodes,
    setEdges,
  ]);

  // --------------------------------
  // Loading state
  // --------------------------------

  if (loading) {
    return (
      <div className="architecture-loading">
        Loading architecture...
      </div>
    );
  }

  // --------------------------------
  // Error state
  // --------------------------------

  if (error) {
    return (
      <div className="message">
        {error}
      </div>
    );
  }

  // --------------------------------
  // Architecture map
  // --------------------------------

  return (
    <div
      className="architecture-map"
      style={{
        width: "100%",
        height: "650px",
        background: "#020617",
        borderRadius: "12px",
        border: "1px solid #1e3a8a",
        overflow: "hidden",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
      >

        <Background />

        <Controls />

        <MiniMap
          nodeColor="#2563eb"
          maskColor="rgba(2, 6, 23, 0.7)"
        />

      </ReactFlow>
    </div>
  );
}

export default ArchitectureMap;