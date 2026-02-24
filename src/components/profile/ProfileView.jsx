import GlobalLevel from './GlobalLevel'
import CategoryCard from './CategoryCard'
import { CATEGORY_LIST } from '@utils/categoryConfig'
import '@styles/pages/profile.css'

export default function ProfileView() {
  return (
    <div className="profile-layout">
      <GlobalLevel />
      <div className="categories-grid">
        {CATEGORY_LIST.map((cat, i) => (
          <CategoryCard key={cat.id} category={cat} index={i} />
        ))}
      </div>
    </div>
  )
}
