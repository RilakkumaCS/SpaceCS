"use client"

import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Home, X } from "lucide-react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Mission {
  id: number
  payload_tons: number
  mission_type: string
  target_type: string
  launch_vehicle: string
  distance_ly: number
  duration_years: number
  science_pts: number
  crew_size: number
  fuel_tons: number
  difficulty: string
  success_probability?: number
}

type MissionResult = {
  missionId: number
  success: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function GameMenu() {
  const [isMuted, setIsMuted] = useState(false)
  const [gameScreen, setGameScreen] = useState<"menu" | "story" | "missions" | "victory" | "defeat">("menu")
  const [displayedText, setDisplayedText] = useState("")
  const [showMissionButton, setShowMissionButton] = useState(false)
//  const [activeMissions, setActiveMissions] = useState<Set<number>>(new Set())
  const [activeMissions, setActiveMissions] = useState<Mission[]>([])
  const [missionProgress, setMissionProgress] = useState<Record<number, number>>({})
  const [gameDays, setGameDays] = useState(30)
  const [funds, setFunds] = useState(1000000)
  const [initialFunds] = useState(1000000)
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([])
  const [completedMissions, setCompletedMissions] = useState<MissionResult[]>([])
  const [showInvestmentPopup, setShowInvestmentPopup] = useState(false)
  const [selectedMissionForInvestment, setSelectedMissionForInvestment] = useState<Mission | null>(null)
  const [distanceReduction, setDistanceReduction] = useState("0")
  const [durationReduction, setDurationReduction] = useState("0")
  const [scienceInvestment, setScienceInvestment] = useState("0")
  const [crewInvestment, setCrewInvestment] = useState("0")
  const [fuelInvestment, setFuelInvestment] = useState("0")
  const [payloadReduction, setPayloadReduction] = useState("0")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [isStoryComplete, setIsStoryComplete] = useState(false)
  const [missionIdCounter, setMissionIdCounter] = useState(1)

  const storyText = `서기 2157년, 인류는 태양계를 넘어 먼 우주로 진출했습니다.

당신은 우주 탐사선 '오디세이 호'의 함장으로 임명되었습니다.

수많은 미지의 행성과 외계 생명체가 당신을 기다리고 있습니다.

이제 당신의 선택이 인류의 미래를 결정할 것입니다.`

  const victoryText = `축하합니다!

당신의 뛰어난 우주 탐사 능력으로 막대한 자금을 확보했습니다.

인류는 이제 더 넓은 우주로 나아갈 수 있게 되었습니다.

당신은 역사상 가장 위대한 우주 탐사가로 기억될 것입니다.`

  const defeatText = `임무 기간이 종료되었습니다.

목표 자금을 확보하지 못했습니다.

하지만 당신의 노력은 헛되지 않았습니다.

다음 기회에는 더 나은 결과를 기대해봅시다.`

  const fetchMissionsFromBackend = async (count = 5) => {
    const missions: Mission[] = []
    for (let i = 0; i < count; i++) {
      try {
        const seed = Date.now() + i
        const response = await fetch(`${API_BASE_URL}/preset?seed=${seed}`)
        const data = await response.json()
        missions.push({
          id: missionIdCounter + i,
          ...data,
          difficulty: "normal",
        })
      } catch (error) {
        console.error("[v0] Failed to fetch mission from backend:", error)
      }
    }
    setMissionIdCounter((prev) => prev + count)
    return missions
  }

  const predictMissionSuccess = async (mission: Mission): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload_tons: mission.payload_tons,
          mission_type: mission.mission_type,
          target_type: mission.target_type,
          launch_vehicle: mission.launch_vehicle,
          distance_ly: mission.distance_ly,
          duration_years: mission.duration_years,
          science_pts: mission.science_pts,
          crew_size: mission.crew_size,
          fuel_tons: mission.fuel_tons,
          clamp_min: 0.0,
          clamp_max: 100.0,
        }),
      })
      const data = await response.json()
      console.log("[v0] Backend prediction for mission", mission.id, ":", data.success_final)
      return data.success_final
    } catch (error) {
      console.error("[v0] Failed to predict mission success:", error)
      return Math.random() * 40 + 30
    }
  }

  const calculateMissionCost = (mission: Mission): number => {
    return Math.round(
      mission.payload_tons * 1000 +
        mission.distance_ly * 100 +
        mission.duration_years * 5000 +
        mission.fuel_tons * 10 +
        mission.crew_size * 2000,
    )
  }

  const vehicleOptions = [
    { name: "Starship", cost: 50000 },
    { name: "Falcon Heavy", cost: 30000 },
    { name: "SLS", cost: 70000 },
    { name: "Ariane 6", cost: 40000 },
  ]

  const calculateInvestmentCost = () => {
    if (!selectedMissionForInvestment) return 0

    const distance = Math.max(0, Number.parseFloat(distanceReduction) || 0)
    const duration = Math.max(0, Number.parseFloat(durationReduction) || 0)
    const science = Math.max(0, Number.parseFloat(scienceInvestment) || 0)
    const crew = Math.max(0, Number.parseInt(crewInvestment) || 0)
    const fuel = Math.max(0, Number.parseFloat(fuelInvestment) || 0)
    const payload = Math.max(0, Number.parseFloat(payloadReduction) || 0)

    const vehicleCost =
      selectedVehicle !== selectedMissionForInvestment?.launch_vehicle
        ? vehicleOptions.find((v) => v.name === selectedVehicle)?.cost || 0
        : 0

    // All reductions and additions cost money
    const additionalInvestment = Math.round(
      distance * 100 + // Distance reduction cost
        duration * 5000 + // Duration reduction cost
        payload * 1000 + // Payload reduction cost
        science * 200 + // Science investment
        crew * 2000 + // Crew investment
        fuel * 10 + // Fuel investment
        vehicleCost,
    )

    // Always include base mission cost
    const baseCost = calculateMissionCost(selectedMissionForInvestment)

    return Math.max(0, baseCost + additionalInvestment)
  }

  useEffect(() => {
    if (gameScreen === "missions" && availableMissions.length === 0) {
      fetchMissionsFromBackend(5).then((missions) => {
        setAvailableMissions(missions)
      })
    }
  }, [gameScreen])

  useEffect(() => {
    if (gameScreen === "missions") {
      if (funds >= initialFunds * 5) {
        setGameScreen("victory")
        setDisplayedText("")
        setShowMissionButton(false)
        setIsStoryComplete(false)
      } else if (gameDays <= 0) {
        setGameScreen("defeat")
        setDisplayedText("")
        setShowMissionButton(false)
        setIsStoryComplete(false)
      }
    }
  }, [funds, gameDays, gameScreen, initialFunds])

  useEffect(() => {
    if (gameScreen === "missions" && !showInvestmentPopup) {
      const timeInterval = setInterval(() => {
        setGameDays((prev) => Math.max(0, prev - 1))
      }, 3000)

      return () => clearInterval(timeInterval)
    }
  }, [gameScreen, showInvestmentPopup])

  useEffect(() => {
    if (gameScreen === "missions" && gameDays % 10 === 0 && gameDays > 0) {
      setAvailableMissions((prev) => {
        const numToRemove = Math.min(2, prev.length)
        const newMissions = prev.slice(numToRemove)
        return newMissions
      })

      fetchMissionsFromBackend(Math.floor(Math.random() * 2) + 2).then((newMissions) => {
        setAvailableMissions((prev) => [...prev, ...newMissions])
      })
    }
  }, [gameDays, gameScreen])

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = []

    activeMissions.forEach((mission) => {
      if (mission && (missionProgress[mission.id] || 0) < 100) {
        const durationInSeconds = mission.duration_years * 3
        const updateIntervalMs = 100
        const progressPerUpdate = (100 / (durationInSeconds * 1000)) * updateIntervalMs

        const interval = setInterval(() => {
          setMissionProgress((prev) => {
            const currentProgress = prev[mission.id] || 0
            const newProgress = Math.min(currentProgress + progressPerUpdate, 100)

            if (newProgress >= 100) {
              clearInterval(interval)

              if (currentProgress < 100) {
                predictMissionSuccess(mission).then((successProbability) => {
                  const randomValue = Math.random() * 100
                  const isSuccess = randomValue < successProbability
                  console.log(
                    "[v0] Mission",
                    mission.id,
                    "- Probability:",
                    successProbability.toFixed(2),
                    "% Random:",
                    randomValue.toFixed(2),
                    "Result:",
                    isSuccess ? "SUCCESS" : "FAILURE",
                  )

                setCompletedMissions((completed) => [...completed, { missionId: mission.id, success: isSuccess }])
                if (isSuccess) {
                  const missionCost = calculateMissionCost(mission)
                  setFunds((prev) => prev + missionCost * 2)
                }
              })
            }
              return { ...prev, [mission.id]: 100 }
            }
            return { ...prev, [mission.id]: newProgress }
          })
        }, updateIntervalMs)

        intervals.push(interval)
      }
    })

    return () => intervals.forEach(clearInterval)
  }, [activeMissions, missionProgress])

  useEffect(() => {
    if (gameScreen === "story" || gameScreen === "victory" || gameScreen === "defeat") {
      let currentIndex = 0
      let typingInterval: NodeJS.Timeout | null = null
      let hasCompletedStory = false

      const currentStoryText = gameScreen === "story" ? storyText : gameScreen === "victory" ? victoryText : defeatText

      const completeStory = () => {
        if (hasCompletedStory) return
        hasCompletedStory = true
        setDisplayedText(currentStoryText)
        setIsStoryComplete(true)
        setTimeout(() => setShowMissionButton(true), 500)
      }

      typingInterval = setInterval(() => {
        if (currentIndex <= currentStoryText.length) {
          setDisplayedText(currentStoryText.slice(0, currentIndex))
          currentIndex++
        } else {
          if (typingInterval) clearInterval(typingInterval)
          completeStory()
        }
      }, 50)

      const handleClick = () => {
        if (!hasCompletedStory) {
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
  }, [gameScreen, storyText, victoryText, defeatText])

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

  /*
  const handleAcceptMission = (missionId: number) => {
    const mission = availableMissions.find((m) => m.id === missionId)
    if (mission) {
      const missionCost = calculateMissionCost(mission)
      if (funds >= missionCost) {
        setFunds((prev) => prev - missionCost)
        setActiveMissions((prev) => new Set(prev).add(missionId))
        setMissionProgress((prev) => ({ ...prev, [missionId]: 0 }))
      }
    }
  }*/

 // (핵심 수정 2)
const handleAcceptMission = (missionId: number) => {
  const mission = availableMissions.find((m) => m.id === missionId)
  if (mission) {
    const missionCost = calculateMissionCost(mission)
    if (funds >= missionCost) {
      setFunds((prev) => prev - missionCost)
      setActiveMissions((prev) => [...prev, mission]) // (수정) 객체 전체를 추가
      setAvailableMissions((prev) => prev.filter(m => m.id !== missionId)) // (중요) 사용 가능 목록에서 제거
      setMissionProgress((prev) => ({ ...prev, [missionId]: 0 }))
    }
  }
}

  const handleOpenInvestment = (mission: Mission) => {
    setSelectedMissionForInvestment(mission)
    setSelectedVehicle(mission.launch_vehicle)
    setDistanceReduction("0")
    setDurationReduction("0")
    setScienceInvestment("0")
    setCrewInvestment("0")
    setFuelInvestment("0")
    setPayloadReduction("0")
    setShowInvestmentPopup(true)
  }

  const handleConfirmInvestment = async () => {
    if (selectedMissionForInvestment) {
      const totalCost = calculateInvestmentCost()

      if (funds >= totalCost) {
        // Apply modifications to mission
        const modifiedMission: Mission = {
          ...selectedMissionForInvestment,
          distance_ly: Math.max(
            0.1,
            selectedMissionForInvestment.distance_ly - (Number.parseFloat(distanceReduction) || 0),
          ),
          duration_years: Math.max(
            0.1,
            selectedMissionForInvestment.duration_years - (Number.parseFloat(durationReduction) || 0),
          ),
          payload_tons: Math.max(
            0.1,
            selectedMissionForInvestment.payload_tons - (Number.parseFloat(payloadReduction) || 0),
          ),
          science_pts:
            selectedMissionForInvestment.science_pts + Math.max(0, Number.parseFloat(scienceInvestment) || 0),
          crew_size: selectedMissionForInvestment.crew_size + Math.max(0, Number.parseInt(crewInvestment) || 0),
          fuel_tons: selectedMissionForInvestment.fuel_tons + Math.max(0, Number.parseFloat(fuelInvestment) || 0),
          launch_vehicle: selectedVehicle,
        }

        console.log("[v0] Modified mission:", modifiedMission)

        setFunds((prev) => prev - totalCost)
        setActiveMissions((prev) => [...prev, modifiedMission]) // (수정) 객체 전체를 추가
        setAvailableMissions((prev) => prev.filter(m => m.id !== selectedMissionForInvestment.id)) // (중요) 사용 가능 목록에서 제거
        setMissionProgress((prev) => ({ ...prev, [selectedMissionForInvestment.id]: 0 }))
        setShowInvestmentPopup(false)
        setSelectedMissionForInvestment(null)
      }
    }
  }

  const handleMissionComplete = (missionId: number) => {
    setActiveMissions((prev) => prev.filter((m) => m.id !== missionId))

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
    setActiveMissions([])
    setMissionProgress({})
    setCompletedMissions([])
    setAvailableMissions([])
    setGameDays(30)
    setFunds(1000000)
    setMissionIdCounter(1)
  }

  const handleResetMissions = async () => {
    const newMissions = await fetchMissionsFromBackend(5)
    setAvailableMissions(newMissions)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e27]">
      {/* Animated space background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={`star1-${i}`}
              className="absolute h-1 w-1 rounded-full bg-white"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Stars layer 2 - bigger stars */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={`star2-${i}`}
              className="absolute h-2 w-2 rounded-full bg-blue-200"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
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
        ) : gameScreen === "story" || gameScreen === "victory" || gameScreen === "defeat" ? (
          <>
            <div className="max-w-3xl mx-auto text-center px-8">
              <p className="text-xl md:text-2xl leading-relaxed text-white whitespace-pre-line font-light">
                {displayedText}
                {!isStoryComplete && <span className="inline-block w-0.5 h-6 bg-cyan-300 ml-1 animate-pulse" />}
              </p>

              {showMissionButton && (
                <div className="mt-12 animate-fade-in flex flex-col gap-4 items-center">
                  {gameScreen === "story" ? (
                    <>
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
                    </>
                  ) : (
                    <Button
                      size="lg"
                      onClick={handleBackToTitle}
                      className="group relative h-16 px-12 overflow-hidden rounded-xl border-2 border-purple-500/50 bg-purple-500/20 text-xl font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-purple-500/40 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                    >
                      <span className="relative z-10">타이틀</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </Button>
                  )}
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
                    const isActive = activeMissions.some((m) => m.id === mission.id)
                    const missionCost = calculateMissionCost(mission)
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
                              {mission.target_type}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>목표 유형</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.mission_type}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-purple-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-purple-300"}`}>
                              투자 비용
                            </p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {missionCost.toLocaleString()} ₵
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-green-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-green-300"}`}>배당금</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {(missionCost * 2).toLocaleString()} ₵
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>임무</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.mission_type} - Crew: {mission.crew_size}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>거리</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.distance_ly.toFixed(1)} ly
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>연료</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.fuel_tons.toFixed(0)} tons
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>기체</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.launch_vehicle}
                            </p>
                          </div>

                          <div
                            className={`rounded-lg p-3 border ${isActive ? "bg-gray-700/30 border-gray-600/20" : "bg-slate-800/50 border-cyan-500/20"}`}
                          >
                            <p className={`text-xs mb-1 ${isActive ? "text-gray-400" : "text-cyan-300"}`}>기간</p>
                            <p className={`text-base font-bold ${isActive ? "text-gray-300" : "text-white"}`}>
                              {mission.duration_years.toFixed(1)} years
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
                                disabled={funds < missionCost}
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

              {activeMissions.length > 0 && (
                <div className="w-80 flex-shrink-0 space-y-4 pr-4 overflow-y-auto max-h-[70vh]">
                  {Array.from(activeMissions).map((mission) => {
                    const progress = missionProgress[mission.id] || 0
                    const completionResult = completedMissions.find((c) => c.missionId === mission.id)

                    return (
                      <div
                        key={mission.id}
                        className="p-4 rounded-xl border-2 border-purple-500/30 bg-slate-900/60 backdrop-blur-md"
                      >
                        <h3 className="text-lg font-bold text-purple-300 mb-2">
                          Mission #{mission.id} {completionResult ? "" : "진행중..."}
                        </h3>
                        <p className="text-sm text-cyan-300 mb-3">{mission?.target_type} 탐사</p>

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
                              onClick={() => handleMissionComplete(mission.id)}
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

            <div className="text-center pb-2 text-cyan-300/60 text-sm">
              ← 좌우로 드래그하여 더 많은 임무를 확인하세요 →
            </div>

            <div className="text-center pb-6">
              <Button
                onClick={handleResetMissions}
                className="group h-12 px-6 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/20 backdrop-blur-sm transition-all hover:bg-cyan-500/40 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              >
                <span className="text-cyan-300 font-bold">임무 재설정</span>
              </Button>
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
          <div className="relative w-full max-w-3xl mx-4 bg-slate-900/95 border-2 border-cyan-500/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(34,211,238,0.3)] max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-cyan-300 mb-3">Mission #{selectedMissionForInvestment.id}</h3>
                <div className="space-y-2 text-sm bg-slate-800/50 p-4 rounded-lg border border-cyan-500/30">
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">목표 대상:</span>{" "}
                    {selectedMissionForInvestment.target_type}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">목표 유형:</span>{" "}
                    {selectedMissionForInvestment.mission_type}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-purple-300 font-bold">기본 투자 비용:</span>{" "}
                    {calculateMissionCost(selectedMissionForInvestment).toLocaleString()} ₵
                  </p>
                  <p className="text-gray-300">
                    <span className="text-green-300 font-bold">배당금:</span>{" "}
                    {(calculateMissionCost(selectedMissionForInvestment) * 2).toLocaleString()} ₵
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">거리:</span>{" "}
                    {selectedMissionForInvestment.distance_ly.toFixed(1)} ly
                    {Number.parseFloat(distanceReduction) > 0 && (
                      <span className="text-red-400"> - {Number.parseFloat(distanceReduction).toFixed(1)} ly</span>
                    )}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">기간:</span>{" "}
                    {selectedMissionForInvestment.duration_years.toFixed(1)} years
                    {Number.parseFloat(durationReduction) > 0 && (
                      <span className="text-red-400"> - {Number.parseFloat(durationReduction).toFixed(1)} years</span>
                    )}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">과학 연구:</span>{" "}
                    {selectedMissionForInvestment.science_pts.toFixed(0)} pts
                    {Number.parseFloat(scienceInvestment) > 0 && (
                      <span className="text-green-400"> + {Number.parseFloat(scienceInvestment).toFixed(0)} pts</span>
                    )}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">승무원:</span> {selectedMissionForInvestment.crew_size}명
                    {Number.parseInt(crewInvestment) > 0 && (
                      <span className="text-green-400"> + {Number.parseInt(crewInvestment)}명</span>
                    )}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">연료:</span>{" "}
                    {selectedMissionForInvestment.fuel_tons.toFixed(0)} tons
                    {Number.parseFloat(fuelInvestment) > 0 && (
                      <span className="text-green-400"> + {Number.parseFloat(fuelInvestment).toFixed(0)} tons</span>
                    )}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">화물:</span>{" "}
                    {selectedMissionForInvestment.payload_tons.toFixed(0)} tons
                    {Number.parseFloat(payloadReduction) > 0 && (
                      <span className="text-red-400"> - {Number.parseFloat(payloadReduction).toFixed(0)} tons</span>
                    )}
                  </p>
                  <p className="text-gray-300">
                    <span className="text-cyan-300 font-bold">기체:</span> {selectedVehicle}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold text-purple-300 mb-3">투자 항목</h3>

                <div>
                  <label className="block text-red-300 text-sm font-bold mb-1">거리 감소 (ly)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={Math.max(0.1, selectedMissionForInvestment.distance_ly - 1)}
                    value={distanceReduction}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value) || 0
                      setDistanceReduction(
                        Math.max(0, Math.min(val, selectedMissionForInvestment.distance_ly - 1)).toString(),
                      )
                    }}
                    placeholder="0"
                    className="bg-slate-800/50 border-red-500/30 text-white h-9"
                  />
                </div>

                <div>
                  <label className="block text-red-300 text-sm font-bold mb-1">기간 감소 (years)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={Math.max(0.1, selectedMissionForInvestment.duration_years - 1)}
                    value={durationReduction}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value) || 0
                      setDurationReduction(
                        Math.max(0, Math.min(val, selectedMissionForInvestment.duration_years - 1)).toString(),
                      )
                    }}
                    placeholder="0"
                    className="bg-slate-800/50 border-red-500/30 text-white h-9"
                  />
                </div>

                <div>
                  <label className="block text-green-300 text-sm font-bold mb-1">과학 연구 추가 (pts)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={scienceInvestment}
                    onChange={(e) =>
                      setScienceInvestment(Math.max(0, Number.parseFloat(e.target.value) || 0).toString())
                    }
                    placeholder="0"
                    className="bg-slate-800/50 border-green-500/30 text-white h-9"
                  />
                </div>

                <div>
                  <label className="block text-green-300 text-sm font-bold mb-1">승무원 추가 (명)</label>
                  <Input
                    type="number"
                    min="0"
                    value={crewInvestment}
                    onChange={(e) => setCrewInvestment(Math.max(0, Number.parseInt(e.target.value) || 0).toString())}
                    placeholder="0"
                    className="bg-slate-800/50 border-green-500/30 text-white h-9"
                  />
                </div>

                <div>
                  <label className="block text-green-300 text-sm font-bold mb-1">연료 추가 (tons)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fuelInvestment}
                    onChange={(e) => setFuelInvestment(Math.max(0, Number.parseFloat(e.target.value) || 0).toString())}
                    placeholder="0"
                    className="bg-slate-800/50 border-green-500/30 text-white h-9"
                  />
                </div>

                <div>
                  <label className="block text-red-300 text-sm font-bold mb-1">화물 감소 (tons)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={Math.max(0.1, selectedMissionForInvestment.payload_tons - 1)}
                    value={payloadReduction}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value) || 0
                      setPayloadReduction(
                        Math.max(0, Math.min(val, selectedMissionForInvestment.payload_tons - 1)).toString(),
                      )
                    }}
                    placeholder="0"
                    className="bg-slate-800/50 border-red-500/30 text-white h-9"
                  />
                </div>

                <div>
                  <label className="block text-cyan-300 text-sm font-bold mb-1">기체 변경</label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger className="bg-slate-800/50 border-cyan-500/30 text-white h-9">
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
                <span className="text-purple-300">총 투자 금액:</span>{" "}
                <span className="text-white">{calculateInvestmentCost().toLocaleString()} ₵</span>
              </p>
              <p className="text-center text-xs text-gray-400 mt-2">
                기본 비용 + 거리·기간·화물 감소 비용 + 과학·승무원·연료 추가 비용
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
