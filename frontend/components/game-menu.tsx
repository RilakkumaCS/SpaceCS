"use client"

import { Button } from "@/components/ui/button"
import { Volume2, VolumeX, Home, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://13.209.163.246:8000"

export default function GameMenu() {
  const [isMuted, setIsMuted] = useState(false)
  const [gameScreen, setGameScreen] = useState<"menu" | "story" | "missions" | "victory" | "defeat" | "tutorial">("menu")
  const [displayedText, setDisplayedText] = useState("")
  const [showMissionButton, setShowMissionButton] = useState(false)
//  const [activeMissions, setActiveMissions] = useState<Set<number>>(new Set())
  const [activeMissions, setActiveMissions] = useState<Mission[]>([])
  const [missionProgress, setMissionProgress] = useState<Record<number, number>>({})
  const [gameDays, setGameDays] = useState(50)
  const [funds, setFunds] = useState(1000000)
  const [initialFunds] = useState(1000000)
  const [targetFunds] = useState(5000000)
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
  const [tutorialStep, setTutorialStep] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [stars1, setStars1] = useState<Array<{ left: string; top: string }>>([])
  const [stars2, setStars2] = useState<Array<{ left: string; top: string; opacity: number }>>([])

  const storyText = `서기XXXX년.외곽 식민지 Ares-7은 구조적 결함으로 위기에 처했습니다.

생명 유지 장치의 촉매제가 고갈되어, 행성의 남은 수명은 앞으로 ${ gameDays }년.

'오리온 무역 연맹'이 독점한 핵심 부품 가격은 ${targetFunds}₵.

당신은 한때 함대 최고의 파일럿이었지만, 지금은 버림받은 용병입니다.

이제 Ares-7의 마지막 희망으로 우주의 임무를 떠납니다.

당신의 결정이 행성의 미래를 결정할 것입니다.`

  const victoryText = `축하합니다!

당신의 숭고하고 탁월한 능력으로 자금을 확보했습니다.

Ares-7은 어느때보다 찬란한 내일을 맞이할 수 있었고

사람들은 희망을 되찾아, 당신을 추앙합니다.

당신은 역사상 가장 위대한 인물로 기억될 것입니다.`

  const defeatText = `당신의 헌신적인 노력에도 불구하고 자금을 마련하는데 실패했습니다.

한때 찬란하게 빛나던 Ares-7은

이제 우주의 역사 저편으로 사라지고 있습니다.

꺼져가는 Ares-7의 빛과 함께 당신도 눈을 감습니다.`

  const tutorialMessages = [
    { target: "period", text: "일정 시간마다 기간이 줄어듭니다. 기간이 완료되기 이전에 자금을 마련하세요" },
    { target: "funds", text: "현재 가지고 있는 자금입니다. 기간내에 목표자금을 모아야 합니다." },
    { target: "accept", text: "임무 기간동안 진행되는 임무입니다. 임무 정보를 보고 임무를 수락할 지 결정하세요. 투자 비용이 발생하고 임무에 성공하면 배당금을 받습니다." },
    { target: "invest", text: "자금을 사용해서 임무에 투자할 수 있습니다." },
  ]


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
    // 1. Audio 객체 생성
    // (space-mission.mp3 파일은 /public 폴더에 있어야 합니다)
    const audio = new Audio("/space-mission.mp3") 
    audio.loop = true  // 반복 재생
    audio.volume = 0.3 // 볼륨 (0.0 ~ 1.0)
    
    // 2. Ref에 오디오 객체 저장
    audioRef.current = audio

    // 4. 컴포넌트가 사라질 때 오디오 정리
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (gameScreen === "missions" && availableMissions.length === 0) {
      fetchMissionsFromBackend(5).then((missions) => {
        setAvailableMissions(missions)
      })
    }
  }, [gameScreen])

  useEffect(() => {
    if (gameScreen === "missions") {
      if (funds >= targetFunds) {
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
                const successProbability = mission.success_probability ?? 50
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
    // 하이드레이션이 완료된 후 클라이언트에서만 별 위치 생성
    const s1 = []
    for (let i = 0; i < 50; i++) {
      s1.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
      })
    }
    setStars1(s1)

    const s2 = []
    for (let i = 0; i < 30; i++) {
      s2.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        opacity: 0.6,
      })
    }
    setStars2(s2)
  }, [])

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
    if (!audioRef.current) return // 오디오가 없으면 아무것도 안 함

    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    audioRef.current.muted = nextMuted

    // (추가) 음소거를 해제할 때 혹시 멈춰있다면 다시 재생
    if (!nextMuted && audioRef.current.paused) {
      audioRef.current.play().catch(e => console.error("오디오 재생 실패:", e));
    }  }

  const handleGameStart = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(e => console.error("오디오 재생 실패:", e));
    }
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

  const handleAcceptMission = async (missionId: number) => {
  const mission = availableMissions.find((m) => m.id === missionId)
  if (mission) {
    const missionCost = calculateMissionCost(mission)
    if (funds >= missionCost) {
      const successProb = await predictMissionSuccess(mission)
      const missionWithProb = { ...mission, success_probability: successProb }

      setFunds((prev) => prev - missionCost)
      setActiveMissions((prev) => [...prev, missionWithProb]) // (수정) 객체 전체를 추가
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
        let modifiedMission: Mission = {
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
        
        const successProb = await predictMissionSuccess(modifiedMission)
        modifiedMission = { ...modifiedMission, success_probability: successProb }

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
    // (추가) 1. 완료된 임무의 결과(성공/실패)를 찾습니다.
    const completionResult = completedMissions.find((c) => c.missionId === missionId);
    
    // (추가) 2. 보상 계산을 위해 활성 임무 목록에서 임무 데이터를 찾습니다.
    const mission = activeMissions.find((m) => m.id === missionId);

    // (추가) 3. 성공한 경우에만 자금을 추가합니다.
    if (completionResult && completionResult.success && mission) {
      const missionCost = calculateMissionCost(mission);
      const reward = missionCost * 2; // (보상 로직)
      setFunds((prev) => prev + reward);
      console.log(`[v0] Mission ${missionId} 보상 획득: +${reward} ₵`);
    }

    setActiveMissions((prev) => prev.filter((m) => m.id !== missionId))

    setMissionProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[missionId]
      return newProgress
    })

    setCompletedMissions((prev) => prev.filter((m) => m.missionId !== missionId))
  }

  const handleBackToTitle = () => {
    setGameScreen("menu")
    setActiveMissions([])
    setMissionProgress({})
    setCompletedMissions([])
    setAvailableMissions([])
    setGameDays(50)
    setFunds(1000000)
    setMissionIdCounter(1)
  }

  const handleResetMissions = async () => {
    const newMissions = await fetchMissionsFromBackend(5)
    setAvailableMissions(newMissions)
  }

  const handleTutorialClick = () => {
    if (tutorialStep < tutorialMessages.length - 1) {
      setTutorialStep((prev) => prev + 1)
    } else {
      setGameScreen("menu")
      setTutorialStep(0)
    }
  }
  
  const handleHowToPlay = () => {
    setGameScreen("tutorial")
    setTutorialStep(0)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0e27]">
      {/* Animated space background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          {stars1.map((style, i) => (
            <div
              key={`star1-${i}`}
              className="absolute h-1 w-1 rounded-full bg-white"
              style={style}
            />
          ))}
        </div>

        {/* Stars layer 2 - bigger stars */}
        <div className="absolute inset-0">
          {stars2.map((style, i) => (
            <div
              key={`star2-${i}`}
              className="absolute h-2 w-2 rounded-full bg-blue-200"
              style={style}
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
              <h2 className="mt-2 font-mono text-3xl font-bold tracking-widest text-cyan-300 md:text-5xl">FUND</h2>
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
                onClick={handleHowToPlay}
                className="group h-16 overflow-hidden rounded-xl border-2 border-secondary bg-secondary/10 text-xl font-bold tracking-wide text-white backdrop-blur-sm transition-all hover:bg-secondary/30 hover:scale-105 hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]"
              >
                <span className="relative z-10">게임 방법</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/30 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </div>
          </>
        ) : gameScreen === "tutorial" ? (
          <div className="w-full h-full flex flex-col" onClick={handleTutorialClick}>
            <div className="flex items-center justify-between px-8 py-6">
              <div className="relative">
                <div className="text-cyan-300 text-lg font-bold">기간: 50년</div>
                {tutorialStep === 0 && (
                  <div className="absolute top-full left-0 mt-4 w-80 bg-slate-900/95 border-2 border-cyan-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-fade-in">
                    <div className="absolute -top-3 left-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-cyan-500/50" />
                    <p className="text-white leading-relaxed">{tutorialMessages[0].text}</p>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white tracking-wider">SpaceMissionList</h1>
              <div className="relative">
                <div className="text-cyan-300 text-lg font-bold">자금: 1,000,000 ₵</div>
                <div className="text-purple-300 text-lg font-bold">목표 자금: { targetFunds.toLocaleString() } ₵</div>
                {tutorialStep === 1 && (
                  <div className="absolute top-full right-0 mt-4 w-80 bg-slate-900/95 border-2 border-cyan-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-fade-in">
                    <div className="absolute -top-3 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-cyan-500/50" />
                    <p className="text-white leading-relaxed">{tutorialMessages[1].text}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-8 py-4">
              <div className="relative w-80 rounded-2xl border-2 border-cyan-500/30 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col">
                <h2 className="text-2xl font-bold text-center mb-6 text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
                  Mission #1
                </h2>

                <div className="space-y-2 mb-6 flex-1 text-sm overflow-y-auto max-h-72">
                  <div className="rounded-lg p-3 border bg-slate-800/50 border-cyan-500/20">
                    <p className="text-xs mb-1 text-cyan-300">목표 대상</p>
                    <p className="text-base font-bold text-white">Moon</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-cyan-500/20">
                    <p className="text-xs mb-1 text-cyan-300">목표 유형</p>
                    <p className="text-base font-bold text-white">Research</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-purple-500/20">
                    <p className="text-xs mb-1 text-purple-300">투자 비용</p>
                    <p className="text-base font-bold text-white">100,000 ₵</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-green-500/20">
                    <p className="text-xs mb-1 text-green-300">배당금</p>
                    <p className="text-base font-bold text-white">200,000 ₵</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-green-500/20">
                    <p className="text-xs mb-1 text-green-300">임무</p>
                    <p className="text-base font-bold text-white">Colonization - Crew</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-green-500/20">
                    <p className="text-xs mb-1 text-green-300">거리</p>
                    <p className="text-base font-bold text-white">10ly</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-green-500/20">
                    <p className="text-xs mb-1 text-green-300">연료</p>
                    <p className="text-base font-bold text-white">1000tons</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-green-500/20">
                    <p className="text-xs mb-1 text-green-300">기체</p>
                    <p className="text-base font-bold text-white">Starship</p>
                  </div>

                  <div className="rounded-lg p-3 border bg-slate-800/50 border-green-500/20">
                    <p className="text-xs mb-1 text-green-300">기간</p>
                    <p className="text-base font-bold text-white">10 years</p>
                  </div>

                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                      임무 수락
                    </Button>
                    {tutorialStep === 2 && (
                        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-4 w-80 bg-slate-900/95 border-2 border-cyan-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-fade-in z-50">
                          <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-cyan-500/50" />
                          <p className="text-white leading-relaxed">{tutorialMessages[2].text}</p>
                        </div>
                    )}
                  </div>
                  <div className="relative">
                    <Button
                      variant="outline"
                      className="w-full border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold py-3 rounded-lg transition-all"
                    >
                      임무 지원금 투자
                    </Button>
                    {tutorialStep === 3 && (
                        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-4 w-80 bg-slate-900/95 border-2 border-cyan-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-fade-in z-50">
                        <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-cyan-500/50" />
                        <p className="text-white leading-relaxed">{tutorialMessages[3].text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pb-6 text-cyan-300 text-lg animate-pulse">
              {tutorialStep < tutorialMessages.length - 1
                ? "화면을 클릭하여 계속하세요"
                : "화면을 클릭하여 메뉴로 돌아가세요"}
            </div>
          </div>
        ): gameScreen === "story" || gameScreen === "victory" || gameScreen === "defeat" ? (
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
              <div className="text-cyan-300 text-lg font-bold">기간: {gameDays}년</div>
              <h1 className="text-3xl font-bold text-white tracking-wider">SpaceMissionList</h1>
              <div className="text-right">
                <div className="text-cyan-300 text-lg font-bold">자금: {funds.toLocaleString()} ₵</div>
                {}
                <div className="text-purple-300 text-lg font-bold">목표 자금: { targetFunds.toLocaleString() } ₵</div>
                </div>
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
                        <div className="flex justify-between items-center text-sm mb-3">
                          <span className="text-cyan-300">{mission?.target_type} 탐사</span>
                          <span className="text-yellow-300 font-bold">
                            임무성공률: {mission.success_probability?.toFixed(0) ?? "??"}%
                          </span>
                        </div>

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
              ← 좌우로 슬라이드하여 더 많은 임무를 확인하세요 →
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
