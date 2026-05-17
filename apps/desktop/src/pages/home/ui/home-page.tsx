import {
  CommentStreamPanel,
  ConnectionStatusPanel,
  SettingsMenu,
} from "../../../widgets";
import "./home-page.css";

export function HomePage() {
  return (
    <main className="home-page">
      <div className="home-page__connection">
        <ConnectionStatusPanel />
      </div>
      <div className="home-page__settings">
        <SettingsMenu />
      </div>
      <div className="home-page__comments">
        <CommentStreamPanel />
      </div>
    </main>
  );
}
