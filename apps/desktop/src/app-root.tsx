import { RuntimeProvider } from "./app/index";
import { HomePage } from "./pages";

function AppRoot() {
  return (
    <RuntimeProvider>
      <HomePage />
    </RuntimeProvider>
  );
}

export default AppRoot;
