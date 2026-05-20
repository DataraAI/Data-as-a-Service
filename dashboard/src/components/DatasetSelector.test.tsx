import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatasetSelector } from './DatasetSelector';
import React from 'react';

describe('DatasetSelector component', () => {
  const mockDatasets = [
    { name: 'Dataset A', uploaded_at: 1672531200 },
    { name: 'Dataset B', uploaded_at: 1672617600 }
  ];

  it('renders with placeholder when no dataset is selected', () => {
    render(<DatasetSelector datasets={mockDatasets} selected="" onChange={vi.fn()} />);
    expect(screen.getByText('Select Dataset')).toBeInTheDocument();
  });

  it('renders selected dataset name', () => {
    render(<DatasetSelector datasets={mockDatasets} selected="Dataset B" onChange={vi.fn()} />);
    expect(screen.getByText('Dataset B')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(<DatasetSelector datasets={mockDatasets} selected="" onChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: /Select Dataset/i });
    fireEvent.click(button);
    expect(screen.getByText('Dataset A')).toBeInTheDocument();
  });

  it('calls onChange when an option is clicked', () => {
    const handleChange = vi.fn();
    render(<DatasetSelector datasets={mockDatasets} selected="" onChange={handleChange} />);
    const button = screen.getByRole('button', { name: /Select Dataset/i });
    fireEvent.click(button);
    
    const option = screen.getByText('Dataset A');
    fireEvent.click(option);
    
    expect(handleChange).toHaveBeenCalledWith('Dataset A');
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
