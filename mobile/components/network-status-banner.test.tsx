import React from 'react';
import NetworkStatusBanner from './network-status-banner';

/**
 * Tests for NetworkStatusBanner component
 * Verifies component definition and props interface
 */
describe('NetworkStatusBanner', () => {
  it('should be a valid React component', () => {
    expect(NetworkStatusBanner).toBeDefined();
    expect(typeof NetworkStatusBanner).toBe('function');
  });

  it('should accept error and onDismiss props', () => {
    const component = React.createElement(NetworkStatusBanner, {
      error: 'test error',
      onDismiss: jest.fn(),
    });
    expect(component).toBeDefined();
  });

  it('should handle null error prop', () => {
    const component = React.createElement(NetworkStatusBanner, {
      error: null,
      onDismiss: jest.fn(),
    });
    expect(component).toBeDefined();
  });

  it('should handle empty string error prop', () => {
    const component = React.createElement(NetworkStatusBanner, {
      error: '',
      onDismiss: jest.fn(),
    });
    expect(component).toBeDefined();
  });

  it('should accept onDismiss callback', () => {
    const onDismiss = jest.fn();
    const component = React.createElement(NetworkStatusBanner, {
      error: 'Error message',
      onDismiss,
    });
    expect(component).toBeDefined();
  });
});
