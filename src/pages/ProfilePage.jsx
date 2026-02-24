import ProfileView from '@components/profile/ProfileView'
import '@styles/pages/profile.css'

export default function ProfilePage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>
      <ProfileView />
    </>
  )
}
