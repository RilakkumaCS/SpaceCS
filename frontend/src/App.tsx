import React from "react";
import MissionCard, { type MissionCardProps } from "./MissionCard";
import "./App.css"; 

const missions: MissionCardProps[] = [
  {
    title: "Mission 1",
    target: "달",
    type: "위성",
    cost: 100,
    reward: 100,
    task: "탐사",
    distance: "100LY",
    fuel: "100t",
    ship: "StarShip",
    duration: "10Y"
  },
  {
    title: "Mission 2",
    target: "달",
    type: "위성",
    cost: 100,
    reward: 100,
    task: "탐사",
    distance: "100LY",
    fuel: "100t",
    ship: "StarShip",
    duration: "10Y"
  },
  {
    title: "Mission 3",
    target: "달",
    type: "위성",
    cost: 100,
    reward: 100,
    task: "탐사",
    distance: "100LY",
    fuel: "100t",
    ship: "StarShip",
    duration: "10Y"
  }
];

const MissionList: React.FC = () => (
  <div style={{ padding: "30px" }}>
    <div className="header-bar">
      <div>임무 기간: 50Y</div>
      <div className="cash">자금: 1000$</div>
    </div>
    <div className="card-list">
      {missions.map((m, idx) => (
        <MissionCard key={idx} {...m} />
      ))}
    </div>
  </div>
);

export default MissionList;
