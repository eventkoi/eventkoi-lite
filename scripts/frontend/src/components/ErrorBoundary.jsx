import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (window.console?.error) {
      console.error("EventKoi block failed to render", error);
    }

    // Lets a mount undo setup it did before rendering, such as re-showing a
    // server-rendered field it had hidden in favour of the editor.
    if (typeof this.props.onError === "function") {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
