import React from "react";

export interface MissionCardProps {
  title: string;
  target: string;
  type: string;
  cost: number;
  reward: number;
  task: string;
  distance: string;
  fuel: string;
  ship: string;
  duration: string;
}

const MissionCard: React.FC<MissionCardProps> = ({
  title, target, type, cost, reward, task, distance, fuel, ship, duration
}) => (
  <div className="mission-card">
    <div className="mission-title">{title}</div>
    <div className="mission-desc">
      목표 대상: {target}<br/>
      목표 유형: {type}<br/>
      투자 비용: {cost}$<br/>
      배당금: {reward}$<br/>
      임무: {task}<br/>
      거리: {distance}<br/>
      연료: {fuel}<br/>
      기체: {ship}<br/>
      기간: {duration}
    </div>
    <button>임무 수락</button>
    <button>임무 지원금 투자</button>
  </div>
);

export default MissionCard;
