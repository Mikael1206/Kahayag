"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
};

type State = { hasError: boolean };

export default class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.retry);
    }
    return this.props.children;
  }
}
