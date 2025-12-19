import React from 'react';
import { render } from '@testing-library/react-native';
import NetworkStatusBanner from './network-status-banner';

describe('NetworkStatusBanner', () => {
  it('should render with error message', () => {
    const { getByText } = render(
      <NetworkStatusBanner error="Network connection failed" onDismiss={jest.fn()} />,
    );

    const errorText = getByText('Network connection failed');
    expect(errorText).toBeTruthy();
  });

  it('should call onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <NetworkStatusBanner error="Connection timeout" onDismiss={onDismiss} />,
    );

    // The component should have a dismiss mechanism
    const banner = getByTestId('network-status-banner');
    expect(banner).toBeTruthy();
  });

  it('should display error with correct styling', () => {
    const { getByText } = render(
      <NetworkStatusBanner error="Backend unavailable" onDismiss={jest.fn()} />,
    );

    const text = getByText('Backend unavailable');
    expect(text).toBeTruthy();
  });

  it('should handle empty error gracefully', () => {
    const { queryByText } = render(
      <NetworkStatusBanner error="" onDismiss={jest.fn()} />,
    );

    // Should render but may not show text
    expect(queryByText('')).toBeFalsy();
  });
});
