import { useState } from 'react'
import { useLearning } from '@context/LearningContext'
import LearningDashboard from '@components/learning/LearningDashboard'
import AreaDetail from '@components/learning/AreaDetail'
import '@styles/pages/learning.css'

export default function LearningPage() {
  const { areas } = useLearning()
  const [selectedAreaId, setSelectedAreaId] = useState(null)

  const selectedArea = selectedAreaId ? areas.find(a => a.id === selectedAreaId) : null

  function handleSelectArea(id) {
    setSelectedAreaId(id)
  }

  function handleBack() {
    setSelectedAreaId(null)
  }

  // If the selected area was deleted while viewing it
  if (selectedAreaId && !selectedArea) {
    setSelectedAreaId(null)
    return null
  }

  if (selectedArea) {
    return <AreaDetail area={selectedArea} onBack={handleBack} />
  }

  return <LearningDashboard onSelectArea={handleSelectArea} />
}
