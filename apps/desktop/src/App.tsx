import { RuntimeProvider } from "./app/index";
import { HomePage } from "./pages";

function App() {
  return (
    <RuntimeProvider>
      <HomePage />
    </RuntimeProvider>
  );
}

export default App;
