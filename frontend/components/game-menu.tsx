"use client"

import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Home, X } from "lucide-react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Mission {
  id: number
  target: string
  type: string
  cost: number // Changed from string to number
  dividend: string
  mission: string
  distance: string
  fuel: string
  vehicle: string
  duration: string
}

type MissionResult = {
  missionId: number
  success: boolean
}

export default function GameMenu() {
  const [isMuted, setIsMuted] = useState(false)
  const [gameScreen, setGameScreen] = useState<"menu" | "story" | "missions">("menu")
  const [displayedText, setDisplayedText] = useState("")
  const [showMissionButton, setShowMissionButton] = useState(false)
  const [activeMissions, setActiveMissions] = useState<Set<number>>(new Set())
  const [missionProgress, setMissionProgress] = useState<Record<number, number>>({})
  const [gameDays, setGameDays] = useState(30)
  const [funds, setFunds] = useState(1000000)
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([])
  const [completedMissions, setCompletedMissions] = useState<MissionResult[]>([])
  const [showInvestmentPopup, setShowInvestmentPopup] = useState(false)
  const [selectedMissionForInvestment, setSelectedMissionForInvestment] = useState<Mission | null>(null)
  const [fuelInvestment, setFuelInvestment] = useState("")
  const [researchInvestment, setResearchInvestment] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [isStoryComplete, setIsStoryComplete] = useState(false)

  const storyText = `서기 2157년, 인류는 태양계를 넘어 먼 우주로 진출했습니다.

당신은 우주 탐사선 '오디세이 호'의 함장으로 임명되었습니다.

수많은 미지의 행성과 외계 생명체가 당신을 기다리고 있습니다.

이제 당신의 선택이 인류의 미래를 결정할 것입니다.`

  const allMissions: Mission[] = [
    {
      id: 1,
      target: "달",
      type: "위성",
      cost: 50000, // Changed from string to number
      dividend: "75,000 ₵",
      mission: "자원 채굴",
      distance: "384,400 km",
      fuel: "2,000 L",
      vehicle: "Lunar Explorer",
      duration: "5",
    },
    {
      id: 2,
      target: "화성",
      type: "행성",
      cost: 150000, // Changed from string to number
      dividend: "250,000 ₵",
      mission: "기지 건설",
      distance: "225,000,000 km",
      fuel: "8,000 L",
      vehicle: "Mars Pioneer",
      duration: "15",
    },
    {
      id: 3,
      target: "유로파",
      type: "위성",
      cost: 200000, // Changed from string to number
      dividend: "350,000 ₵",
      mission: "생명체 탐사",
      distance: "628,000,000 km",
      fuel: "12,000 L",
      vehicle: "Deep Explorer",
      duration: "20",
    },
    {
      id: 4,
      target: "타이탄",
      type: "위성",
      cost: 250000, // Changed from string to number
      dividend: "450,000 ₵",
      mission: "대기 분석",
      distance: "1,200,000,000 km",
      fuel: "15,000 L",
      vehicle: "Titan Scout",
      duration: "25",
    },
    {
      id: 5,
      target: "목성",
      type: "행성",
      cost: 500000, // Changed from string to number
      dividend: "900,000 ₵",
      mission: "궤도 관측",
      distance: "778,000,000 km",
      fuel: "20,000 L",
      vehicle: "Jupiter Voyager",
      duration: "30",
    },
    {
      id: 6,
      target: "토성",
      type: "행성",
      cost: 600000, // Changed from string to number
      dividend: "1,100,000 ₵",
      mission: "고리 연구",
      distance: "1,400,000,000 km",
      fuel: "25,000 L",
      vehicle: "Saturn Observer",
      duration: "35",
    },
    {
      id: 7,
      target: "소행성 벨트",
      type: "소행성군",
      cost: 100000, // Changed from string to number
      dividend: "180,000 ₵",
      mission: "광물 채취",
      distance: "450,000,000 km",
      fuel: "6,000 L",
      vehicle: "Asteroid Miner",
      duration: "10",
    },
    {
      id: 8,
      target: "명왕성",
      type: "왜행성",
      cost: 800000, // Changed from string to number
      dividend: "1,500,000 ₵",
      mission: "극지 탐사",
      distance: "5,900,000,000 km",
      fuel: "35,000 L",
      vehicle: "Deep Space Pioneer",
      duration: "40",
    },
  ]

  const vehicleOptions = [
    { name: "Lunar Explorer", cost: 10000 },
    { name: "Mars Pioneer", cost: 30000 },
    { name: "Deep Explorer", cost: 50000 },
    { name: "Titan Scout", cost: 70000 },
    { name: "Jupiter Voyager", cost: 100000 },
    { name: "Saturn Observer", cost: 120000 },
    { name: "Asteroid Miner", cost: 25000 },
    { name: "Deep Space Pioneer", cost: 150000 },
  ]

  const calculateInvestmentCost = () => {
    const fuel = Number.parseInt(fuelInvestment) || 0
    const research = Number.parseInt(researchInvestment) || 0
    const vehicleCost = vehicleOptions.find((v) => v.name === selectedVehicle)?.cost || 0
    return fuel * 10 + research * 100 + vehicleCost
  }

  useEffect(() => {
    if (gameScreen === "missions" && availableMissions.length === 0) {
      const shuffled = [...allMissions].sort(() => Math.random() - 0.5)
      const numMissions = Math.floor(Math.random() * 2) + 2
      const initialMissions = shuffled.slice(0, numMissions)
      setAvailableMissions(initialMissions)
    }
  }, [gameScreen])

  useEffect(() => {
    if (gameScreen === "missions" && !showInvestmentPopup) {
      const timeInterval = setInterval(() => {
        setGameDays((prev) => Math.max(0, prev - 1))
      }, 3000) // Every 3 seconds, 1 day decreases

      return () => clearInterval(timeInterval)
    }
  }, [gameScreen, showInvestmentPopup])

  useEffect(() => {
    if (gameScreen === "missions" && gameDays % 10 === 0 && gameDays > 0) {
      setAvailableMissions((prev) => {
        const numToRemove = Math.min(2, prev.length)
        const newMissions = prev.slice(numToRemove)

        const unusedMissions = allMissions.filter(
          (m) => !newMissions.some((am) => am.id === m.id) && !activeMissions.has(m.id),
        )

        if (unusedMissions.length > 0) {
          const numToAdd = Math.floor(Math.random() * 2) + 2
          const shuffled = [...unusedMissions].sort(() => Math.random() - 0.5)
          return [...newMissions, ...shuffled.slice(0, Math.min(numToAdd, unusedMissions.length))]
        }

        return newMissions
      })
    }
  }, [gameDays, gameScreen])

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = []

    activeMissions.forEach((missionId) => {
      const mission = availableMissions.find((m) => m.id === missionId) || allMissions.find((m) => m.id === missionId)
      if (mission && (missionProgress[missionId] || 0) < 100) {
        const durationDays = Number.parseInt(mission.duration)
        const totalTimeMs = durationDays * 1000
        const updateIntervalMs = 100
        const progressPerUpdate = (100 / totalTimeMs) * updateIntervalMs

        const interval = setInterval(() => {
          setMissionProgress((prev) => {
            const currentProgress = prev[missionId] || 0
            if (currentProgress >= 100) {
              clearInterval(interval)
              const isSuccess = Math.random() > 0.2
              setCompletedMissions((completed) => [...completed, { missionId, success: isSuccess }])
              if (isSuccess && mission) {
                setFunds((prev) => prev + mission.cost * 2)
              }
              return prev
            }
            return { ...prev, [missionId]: Math.min(currentProgress + progressPerUpdate, 100) }
          })
        }, updateIntervalMs)

        intervals.push(interval)
      }
    })

    return () => intervals.forEach(clearInterval)
  }, [activeMissions, availableMissions])

  useEffect(() => {
    if (gameScreen === "story") {
      let currentIndex = 0
      let typingInterval: NodeJS.Timeout | null = null

      const completeStory = () => {
        setDisplayedText(storyText)
        setIsStoryComplete(true)
        setTimeout(() => setShowMissionButton(true), 500)
      }

      typingInterval = setInterval(() => {
        if (currentIndex <= storyText.length) {
          setDisplayedText(storyText.slice(0, currentIndex))
          currentIndex++
        } else {
          if (typingInterval) clearInterval(typingInterval)
          setIsStoryComplete(true)
          setTimeout(() => setShowMissionButton(true), 500)
        }
      }, 50)

      const handleClick = () => {
        if (!isStoryComplete) {
          if (typingInterval) clearInterval(typingInterval)
          completeStory()
        }
      }

      document.addEventListener("click", handleClick)

      return () => {
        if (typingInterval) clearInterval(typingInterval)
        document.removeEventListener("click", handleClick)
      }
    }
  }, [gameScreen, storyText])

  const toggleSound = () => {
    setIsMuted(!isMuted)
  }

  const handleGameStart = () => {
    setDisplayedText("")
    setShowMissionButton(false)
    setIsStoryComplete(false)
    setGameScreen("story")
  }

  const handleBackToMenu = () => {
    setGameScreen("menu")
    setDisplayedText("")
    setShowMissionButton(false)
    setIsStoryComplete(false)
  }

  const handleMissionSelect = () => {
    setGameScreen("missions")
  }

  const handleAcceptMission = (missionId: number) => {
    const mission = availableMissions.find((m) => m.id === missionId) || allMissions.find((m) => m.id === missionId)
    if (mission && funds >= mission.cost) {
      setFunds((prev) => prev - mission.cost)
      setActiveMissions((prev) => new Set(prev).add(missionId))
      setMissionProgress((prev) => ({ ...prev, [missionId]: 0 }))
    }
  }

  const handleOpenInvestment = (mission: Mission) => {
    setSelectedMissionForInvestment(mission)
    setSelectedVehicle(mission.vehicle)
    setFuelInvestment("")
    setResearchInvestment("")
    setShowInvestmentPopup(true)
  }

  const handleConfirmInvestment = () => {
    if (selectedMissionForInvestment) {
      const totalCost = calculateInvestmentCost()
      if (funds >= totalCost) {
        setFunds((prev) => prev - totalCost)
        handleAcceptMission(selectedMissionForInvestment.id)
        setShowInvestmentPopup(false)
        setSelectedMissionForInvestment(null)
      }
    }
  }

  const handleMissionComplete = (missionId: number) => {
    setActiveMissions((prev) => {
      const newSet = new Set(prev)
      newSet.delete(missionId)
      return newSet
    })

    setMissionProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[missionId]
      return newProgress
    })

    setCompletedMissions((prev) => prev.filter((m) => m.missionId !== missionId))

    setAvailableMissions((prev) => prev.filter((m) => m.id !== missionId))
  }

  const handleBackToTitle = () => {
    setGameScreen("menu")
    setActiveMissions(new Set())
    setMissionProgress({})
    setCompletedMissions([])
    setAvailableMissions([])
    setGameDays(30)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e27]">
      {/* Animated space background */}
      <div className="absolute inset-0">
        {/* Stars layer 1 */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={`star1-${i}`}
              className="absolute h-1 w-1 rounded-full bg-white animate-twinkle-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Stars layer 2 - bigger stars */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={`star2-${i}`}
              className="absolute h-2 w-2 rounded-full bg-blue-200 animate-twinkle-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Nebula effect */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

        {/* Planets */}
        <div
          className="absolute top-20 right-20 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 opacity-30 blur-sm animate-float"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute bottom-32 left-16 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-sm animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {gameScreen === "menu" ? (
          <>
            {/* Game title */}
            <div className="mb-16 text-center">
              <h1 className="font-mono text-6xl font-bold tracking-wider text-white md:text-8xl">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                  SPACE
                </span>
              </h1>
              <h2 className="mt-2 font-mono text-3xl font-bold tracking-widest text-cyan-300 md:text-5xl">ADVENTURE</h2>
            </div>

            {/* Menu buttons */}
            <div className="flex flex-col gap-6 w-full max-w-md">
              <Button
                size="lg"
                onClick={handleGameStart}
                className="group relative h-16 overflow-hidden rounded-xl border-2 border-primary bg-primary/20 text-xl font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-primary/40 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              >
                <span className="relative z-10">게임 시작</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="group h-16 overflow-hidden rounded-xl border-2 border-secondary bg-secondary/10 text-xl font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-secondary/30 hover:scale-105 hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]"
              >
                <span className="relative z-10">게임 방법</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/30 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </div>
          </>
        ) : gameScreen === "story" ? (
          <>
            <div className="max-w-3xl mx-auto text-center px-8">
              <p className="text-xl md:text-2xl leading-relaxed text-white whitespace-pre-line font-light">
                {displayedText}
                {!isStoryComplete && <span className="inline-block w-0.5 h-6 bg-cyan-300 ml-1 animate-pulse" />}
              </p>

              {showMissionButton && (
                <div className="mt-12 animate-fade-in flex flex-col gap-4 items-center">
                  <Button
                    size="lg"
                    onClick={handleMissionSelect}
                    className="group relative h-16 px-12 overflow-hidden rounded-xl border-2 border-primary bg-primary/20 text-xl font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-primary/40 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                  >
                    <span className="relative z-10">임무 선택</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBackToMenu}
                    className="group h-14 px-10 overflow-hidden rounded-xl border-2 border-muted-foreground/30 bg-muted/10 text-lg font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-muted/30 hover:scale-105 hover:shadow-[0_0_20px_rgba(148,163,184,0.3)]"
                  >
                    <span className="relative z-10">돌아가기</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-500/0 via-slate-500/20 to-slate-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between px-8 py-6">
              <div className="text-cyan-300 text-lg font-bold">기간: {gameDays}일</div>
              <h1 className="text-3xl font-bold text-white tracking-wider">SpaceMissionList</h1>
              <div className="text-cyan-300 text-lg font-bold">자금: {funds.toLocaleString()} ₵</div>
            </div>

            <div className="flex-1 flex items-center px-8 py-4 gap-8">
              <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide">
                <div className="flex gap-6 pb-4 px-4">
                  {availableMissions.map((mission) => {
                    const isActive = activeMissions.has(mission.id)
                    return (
                      <div
                        key={mission.id}
                        className={`flex-shrink-0 w-80 rounded-2xl border-2 p-6 flex flex-col transition-all duration-300 ${
                          isActive
                            ? "border-gray-600/50 bg-gray-800/40 backdrop-blur-md"
                            : "border-cyan-500/30 bg-slate-900/40 backdrop-blur-md hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                        }`}
                      >
                        <h2
                          className={`text-2xl font-bold text-center mb-6 ${
                            isActive
                              ? "text-gray-400"
                              : "text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text"
                          }`}
                        >
                          Mission #{mission.id}
                        </h2>

                        <div className="space-y-2 mb-6 flex-1 text-sm overflow-y-auto max-h-72">
                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>목표 대상</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.target}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>목표 유형</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.type}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-purple-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-purple-300"}`}>
                              투자 비용
                            </p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.cost.toLocaleString()} ₵
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-green-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-green-300"}`}>배당금</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.dividend}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>임무</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.mission}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>거리</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.distance}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>연료</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.fuel}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>기체</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.vehicle}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>기간</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.duration}일
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {isActive ? (
                            <Button
                              disabled
                              className="w-full bg-gray-600 text-gray-300 font-bold py-3 rounded-lg cursor-not-allowed"
                            >
                              임무중
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleAcceptMission(mission.id)}
                                disabled={funds < mission.cost}
                                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                임무 수락
                              </Button>
                              <Button
                                onClick={() => handleOpenInvestment(mission)}
                                variant="outline"
                                className="w-full border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold py-3 rounded-lg transition-all"
                              >
                                임무 지원금 투자
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {activeMissions.size > 0 && (
                <div className="w-80 flex-shrink-0 space-y-4 pr-4 overflow-y-auto max-h-[70vh]">
                  {Array.from(activeMissions).map((missionId) => {
                    const mission =
                      availableMissions.find((m) => m.id === missionId) || allMissions.find((m) => m.id === missionId)
                    const progress = missionProgress[missionId] || 0
                    const completionResult = completedMissions.find((c) => c.missionId === missionId)

                    return (
                      <div
                        key={missionId}
                        className="p-4 rounded-xl border-2 border-purple-500/30 bg-slate-900/60 backdrop-blur-md"
                      >
                        <h3 className="text-lg font-bold text-purple-300 mb-2">
                          Mission #{missionId} {completionResult ? "" : "진행중..."}
                        </h3>
                        <p className="text-sm text-cyan-300 mb-3">{mission?.target} 탐사</p>

                        {completionResult ? (
                          <div className="space-y-3">
                            <div
                              className={`p-4 rounded-lg text-center font-bold text-lg ${
                                completionResult.success
                                  ? "bg-green-500/20 text-green-300 border-2 border-green-500/50"
                                  : "bg-red-500/20 text-red-300 border-2 border-red-500/50"
                              }`}
                            >
                              {completionResult.success ? "임무 성공!" : "임무 실패"}
                            </div>
                            <Button
                              onClick={() => handleMissionComplete(missionId)}
                              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-2 rounded-lg"
                            >
                              확인
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300 ease-linear"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <p className="text-right text-xs text-gray-400 mt-1">{Math.floor(progress)}%</p>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="text-center pb-6 text-cyan-300/60 text-sm">
              ← 좌우로 드래그하여 더 많은 임무를 확인하세요 →
            </div>

            <div className="absolute bottom-8 right-8">
              <Button
                onClick={handleBackToTitle}
                className="group h-12 px-6 rounded-xl border-2 border-purple-500/30 bg-purple-500/20 backdrop-blur-sm transition-all hover:bg-purple-500/40 hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-2"
              >
                <Home className="h-5 w-5 text-purple-300" />
                <span className="text-purple-300 font-bold">타이틀</span>
              </Button>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 left-8">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSound}
            className="group h-14 w-14 rounded-full border-2 border-muted-foreground/30 bg-muted/20 backdrop-blur-sm transition-all hover:bg-muted/40 hover:scale-110 hover:border-accent"
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
            ) : (
              <Volume2 className="h-6 w-6 text-cyan-300 group-hover:text-accent transition-colors" />
            )}
          </Button>
        </div>
      </div>

      {showInvestmentPopup && selectedMissionForInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl mx-4 bg-slate-900/95 border-2 border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <button
              onClick={() => setShowInvestmentPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              임무 지원금 투자
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xl font-bold text-cyan-300 mb-3">Mission #{selectedMissionForInvestment.id}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">
                    <span className="text-cyan-300">목표:</span> {selectedMissionForInvestment.target}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300">임무:</span> {selectedMissionForInvestment.mission}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300">기간:</span> {selectedMissionForInvestment.duration}일
                  </p>
                  <p className="text-gray-300">
                    <span className="text-green-300">배당금:</span> {selectedMissionForInvestment.dividend}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-cyan-300 text-sm font-bold mb-2">연료 투자 (L)</label>
                  <Input
                    type="number"
                    value={fuelInvestment}
                    onChange={(e) => setFuelInvestment(e.target.value)}
                    placeholder="리터 단위"
                    className="bg-slate-800/50 border-cyan-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="block text-cyan-300 text-sm font-bold mb-2">연구 투자</label>
                  <Input
                    type="number"
                    value={researchInvestment}
                    onChange={(e) => setResearchInvestment(e.target.value)}
                    placeholder="연구 포인트"
                    className="bg-slate-800/50 border-cyan-500/30 text-white"
                  />
                </div>

                <div>
                  <label className="block text-cyan-300 text-sm font-bold mb-2">기체 변경</label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/30 text-white">
                      <SelectValue placeholder="기체 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-cyan-500/30">
                      {vehicleOptions.map((vehicle) => (
                        <SelectItem key={vehicle.name} value={vehicle.name} className="text-white">
                          {vehicle.name} ({vehicle.cost.toLocaleString()} ₵)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border-2 border-purple-500/30 rounded-lg p-4 mb-6">
              <p className="text-center text-xl font-bold">
                <span className="text-purple-300">투자 금액:</span>{" "}
                <span className="text-white">{calculateInvestmentCost().toLocaleString()} ₵</span>
              </p>
              <p className="text-center text-xs text-gray-400 mt-2">
                연료: {fuelInvestment || 0}L × 10 ₵ + 연구: {researchInvestment || 0} × 100 ₵ + 기체 비용
              </p>
            </div>

            <Button
              onClick={handleConfirmInvestment}
              disabled={funds < calculateInvestmentCost()}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-4 rounded-lg text-lg transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              투자 확정
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
