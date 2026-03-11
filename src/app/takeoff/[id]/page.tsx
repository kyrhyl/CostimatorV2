'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ElementTemplatesEditor from '@/components/takeoff/ElementTemplatesEditor';
import TakeoffViewer from '@/components/takeoff/TakeoffViewer';
import CalcRunHistory from '@/components/takeoff/CalcRunHistory';
import GridEditorWrapper from './components/GridEditorWrapper';
import LevelsEditorWrapper from './components/LevelsEditorWrapper';
import ElementInstancesWrapper from './components/ElementInstancesWrapper';
import FloorPlanVisualizationWrapper from './components/FloorPlanVisualizationWrapper';
import BOQViewer from '@/components/takeoff/BOQViewer';
import EarthworkItems from '@/components/takeoff/EarthworkItems';
import ExcavationStations from '@/components/takeoff/ExcavationStations';
import StructureExcavation from '@/components/takeoff/StructureExcavation';
import EmbankmentItems from '@/components/takeoff/EmbankmentItems';
import DoorsWindowsSchedule from '@/components/takeoff/DoorsWindowsSchedule';
import GenericScheduleItems from '@/components/takeoff/GenericScheduleItems';
import SpacesManager from '@/components/takeoff/PartE/SpacesManager';
import WallSurfacesManager from '@/components/takeoff/PartE/WallSurfacesManager';
import FinishesManager from '@/components/takeoff/PartE/FinishesManager';
import RoofingManager from '@/components/takeoff/PartE/RoofingManager';
import CalcRunList from '@/components/takeoff/CalcRunList';

interface IProject {
  _id: string;
  projectName: string;
  projectLocation: string;
  status: string;
  grid?: {
    xLines?: any[];
    yLines?: any[];
  };
  gridX?: any[];
  gridY?: any[];
  levels?: any[];
  scheduleItems?: {
    id: string;
    category: string;
    dpwhItemNumberRaw: string;
    descriptionOverride?: string;
    unit: string;
    qty: number;
    tags?: string[];
  }[];
}

type DPWHPart = 'C' | 'D' | 'E' | 'F' | 'G';
type TabType = 'overview' | 'grid' | 'levels' | 'templates' | 'instances' | 'visualization' | 'history' | 'takeoff' | 'boq' | 'versions' |
  'clearing' | 'excavation' | 'structure-excavation' | 'embankment' |
  'spaces' | 'wallSurfaces' | 'finishes' | 'roofing' | 'doors-windows' | 'generic-items';

interface TabConfig {
  id: TabType;
  label: string;
  icon: JSX.Element;
  part?: DPWHPart;
}

export default function TakeoffWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePart, setActivePart] = useState<DPWHPart>('D');
  const [activeTab, setActiveTab] = useState<TabType>('grid');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const fetchStateRef = useRef({ loading: false, lastFetchAt: 0 });

  const earthworksCategories = [
    {
      id: 'earthworks-clearing',
      label: 'Clearing & Grubbing',
      description: 'Clearing, grubbing, and site prep'
    },
    {
      id: 'earthworks-removal-trees',
      label: 'Removal of Trees',
      description: 'Tree removal and disposal'
    },
    {
      id: 'earthworks-removal-structures',
      label: 'Removal of Structures',
      description: 'Demolition and disposal'
    },
    {
      id: 'earthworks-excavation',
      label: 'Excavation',
      description: 'Average area excavation'
    },
    {
      id: 'earthworks-structure-excavation',
      label: 'Structure Excavation',
      description: 'Footings, foundations, utilities'
    },
    {
      id: 'earthworks-embankment',
      label: 'Embankment',
      description: 'Fill, borrow, compaction'
    },
    {
      id: 'earthworks-site-development',
      label: 'Site Development',
      description: 'Other earthworks items'
    },
  ];

  const scheduleItems = project?.scheduleItems || [];
  const earthworkItems = scheduleItems.filter(item => item.category.startsWith('earthworks-'));
  const totalEarthworkItems = earthworkItems.length;
  const totalEarthworkQty = earthworkItems.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalEarthworkUnits = Array.from(new Set(earthworkItems.map(item => item.unit).filter(Boolean)));
  const totalEarthworkUnitLabel = totalEarthworkUnits.length === 1
    ? totalEarthworkUnits[0]
    : totalEarthworkUnits.length === 0
      ? ''
      : 'Mixed units';

  const summarizeCategory = (categoryId: string) => {
    const items = earthworkItems.filter(item => item.category === categoryId);
    const qty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
    const units = Array.from(new Set(items.map(item => item.unit).filter(Boolean)));
    return {
      count: items.length,
      qty,
      unitLabel: units.length === 1 ? units[0] : units.length === 0 ? '' : 'Mixed units',
    };
  };

  const recentEarthworkItems = earthworkItems.slice(-5).reverse();

  const fetchProject = useCallback(async () => {
    const now = Date.now();
    if (fetchStateRef.current.loading || now - fetchStateRef.current.lastFetchAt < 3000) {
      return;
    }

    fetchStateRef.current.loading = true;
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.data);
      } else {
        setError(data.error || 'Failed to load project');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      fetchStateRef.current.loading = false;
      fetchStateRef.current.lastFetchAt = Date.now();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId, fetchProject]);

  // Define tabs for each DPWH Part
  const partDTabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'grid',
      label: 'Grid System',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      )
    },
    {
      id: 'levels',
      label: 'Floor Levels',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'templates',
      label: 'Element Templates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'instances',
      label: 'Element Instances',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      id: 'visualization',
      label: 'Floor Plan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      id: 'history',
      label: 'Calc History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const partETabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'spaces',
      label: 'Spaces',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'wallSurfaces',
      label: 'Wall Surfaces',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
        </svg>
      )
    },
    {
      id: 'finishes',
      label: 'Finishes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      id: 'roofing',
      label: 'Roofing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
        </svg>
      )
    },
    {
      id: 'doors-windows',
      label: 'Doors & Windows',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      )
    },
    {
      id: 'generic-items',
      label: 'Other Items',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
  ];

  const partCTabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'clearing',
      label: 'Clearing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'excavation',
      label: 'Excavation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )
    },
    {
      id: 'structure-excavation',
      label: 'Structure Excavation',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      id: 'embankment',
      label: 'Embankment',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    },
  ];

  const reportTabs: TabConfig[] = [
    {
      id: 'takeoff',
      label: 'Takeoff Summary',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'boq',
      label: 'Bill of Quantities',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 'versions',
      label: 'Version Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  // Get current tabs based on active part
  const getCurrentTabs = (): TabConfig[] => {
    if (activeTab === 'takeoff' || activeTab === 'boq') {
      return reportTabs;
    }
    switch (activePart) {
      case 'D': return partDTabs;
      case 'E': return partETabs;
      case 'C': return partCTabs;
      default: return [];
    }
  };

  const currentTabs = getCurrentTabs();

  // Get part color
  const getPartColor = (part: DPWHPart) => {
    switch (part) {
      case 'C': return { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-400', hover: 'hover:bg-amber-50' };
      case 'D': return { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-400', hover: 'hover:bg-blue-50' };
      case 'E': return { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-400', hover: 'hover:bg-green-50' };
      case 'F': return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-400', hover: 'hover:bg-yellow-50' };
      case 'G': return { bg: 'bg-purple-100', text: 'text-purple-800', ring: 'ring-purple-400', hover: 'hover:bg-purple-50' };
    }
  };

  const partColor = getPartColor(activePart);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-6">{error || 'Project not found'}</p>
          <Link
            href="/takeoff"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Header with DPWH Parts Horizontal Navigation */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        {/* Project Info Bar */}
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/takeoff" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Takeoff
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-lg font-bold text-gray-900">{project.projectName}</h1>
              <div className="text-sm text-gray-600">• {project.projectLocation}</div>
            </div>
            <Link
              href={`/projects/${projectId}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Project Details
            </Link>
          </div>
        </div>

        {/* DPWH Parts - Horizontal Navigation */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">DPWH Parts:</span>
            {[
              { id: 'C' as DPWHPart, label: 'Part C - Earthworks', color: 'amber' },
              { id: 'D' as DPWHPart, label: 'Part D - Concrete & Reinforcement', color: 'blue' },
              { id: 'E' as DPWHPart, label: 'Part E - Finishing & Civil Works', color: 'green' },
              { id: 'F' as DPWHPart, label: 'Part F - Electrical', color: 'yellow' },
              { id: 'G' as DPWHPart, label: 'Part G - Mechanical', color: 'purple' },
            ].map((part) => {
              const isActive = activePart === part.id;
              const colorClasses = {
                amber: isActive ? 'bg-amber-100 text-amber-800 border-amber-400 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:border-amber-300',
                blue: isActive ? 'bg-blue-100 text-blue-800 border-blue-400 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300',
                green: isActive ? 'bg-green-100 text-green-800 border-green-400 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-300',
                yellow: isActive ? 'bg-yellow-100 text-yellow-800 border-yellow-400 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-yellow-50 hover:border-yellow-300',
                purple: isActive ? 'bg-purple-100 text-purple-800 border-purple-400 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300',
              }[part.color];

              return (
                <button
                  key={part.id}
                  onClick={() => {
                    setActivePart(part.id);
                    setActiveTab('overview');
                  }}
                  className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${colorClasses}`}
                >
                  {part.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Layout - Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Vertical Navigation for Subsections */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col flex-shrink-0`}>
          {/* Sidebar Header */}
          <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
            {!isSidebarCollapsed && (
              <div className="text-sm font-semibold text-gray-900">
                {activePart === 'C' ? 'Earthworks' :
                 activePart === 'D' ? 'Concrete' :
                 activePart === 'E' ? 'Finishes' :
                 activePart === 'F' ? 'Electrical' :
                 'Mechanical'}
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded flex-shrink-0"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
            </button>
          </div>

          {/* Navigation Tabs - Vertical */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {!isSidebarCollapsed && (
              <div className="text-xs font-medium text-gray-500 mb-2 px-2">SECTIONS</div>
            )}
            {currentTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? `${partColor.bg} ${partColor.text}`
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={tab.label}
              >
                {tab.icon}
                {!isSidebarCollapsed && <span className="text-sm font-medium">{tab.label}</span>}
              </button>
            ))}
            
            {/* Reports Section */}
            {!isSidebarCollapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-500 mb-2 px-2">REPORTS</div>
              </div>
            )}
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={tab.label}
              >
                {tab.icon}
                {!isSidebarCollapsed && <span className="text-sm font-medium">{tab.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Content Header */}
          <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">
              {currentTabs.find(t => t.id === activeTab)?.label || reportTabs.find(t => t.id === activeTab)?.label}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${partColor.bg} ${partColor.text}`}>
              {activePart === 'C' ? 'Part C' :
               activePart === 'D' ? 'Part D' :
               activePart === 'E' ? 'Part E' :
               activePart === 'F' ? 'Part F' :
               'Part G'}
            </span>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {/* Part D Content */}
        {activePart === 'D' && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">Part D - Concrete & Reinforcement</h2>
                  <p className="text-sm text-blue-700">
                    Structural elements including beams, columns, slabs, footings, and reinforcement steel
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Grid System</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">X-Axis Lines:</span>{' '}
                        <span className="font-medium">{(project.grid?.xLines?.length || project.gridX?.length || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Y-Axis Lines:</span>{' '}
                        <span className="font-medium">{(project.grid?.yLines?.length || project.gridY?.length || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Levels:</span>{' '}
                        <span className="font-medium">{project.levels?.length || 0}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('grid')}
                      className="mt-4 text-blue-600 hover:underline text-sm"
                    >
                      Edit Grid →
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'grid' && <GridEditorWrapper projectId={projectId} />}
            {activeTab === 'levels' && <LevelsEditorWrapper projectId={projectId} />}
            {activeTab === 'templates' && <ElementTemplatesEditor projectId={projectId} />}
            {activeTab === 'instances' && <ElementInstancesWrapper projectId={projectId} />}
            {activeTab === 'visualization' && <FloorPlanVisualizationWrapper projectId={projectId} />}
            {activeTab === 'history' && <CalcRunHistory projectId={projectId} />}
          </>
        )}

        {/* Part E Content */}
        {activePart === 'E' && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-green-900 mb-2">Part E - Finishing & Other Civil Works</h2>
                  <p className="text-sm text-green-700 mb-4">
                    Finishes, roofing, doors, windows, hardware, and other architectural items
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-xs font-medium text-green-600 mb-1">Mode A</div>
                      <div className="font-semibold text-sm">Surface-Based</div>
                      <div className="text-xs text-gray-600 mt-1">Floor, wall, ceiling finishes</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-xs font-medium text-blue-600 mb-1">Mode B</div>
                      <div className="font-semibold text-sm">Roof-System</div>
                      <div className="text-xs text-gray-600 mt-1">Roofing with slope factors</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-xs font-medium text-purple-600 mb-1">Mode C</div>
                      <div className="font-semibold text-sm">Schedule-Based</div>
                      <div className="text-xs text-gray-600 mt-1">Doors, windows, hardware</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'spaces' && project.gridX && project.gridY && project.levels && (
              <SpacesManager 
                projectId={projectId}
                levels={project.levels}
                gridX={project.gridX}
                gridY={project.gridY}
              />
            )}
            {activeTab === 'wallSurfaces' && project.gridX && project.gridY && project.levels && (
              <WallSurfacesManager 
                projectId={projectId}
                levels={project.levels}
                gridX={project.gridX}
                gridY={project.gridY}
              />
            )}
            {activeTab === 'finishes' && project.gridX && project.gridY && (
              <FinishesManager 
                projectId={projectId}
                gridX={project.gridX}
                gridY={project.gridY}
              />
            )}
            {activeTab === 'roofing' && (
              <RoofingManager 
                projectId={projectId}
              />
            )}
            {activeTab === 'doors-windows' && <DoorsWindowsSchedule projectId={projectId} category="doors" />}
            {activeTab === 'generic-items' && <GenericScheduleItems projectId={projectId} />}
          </>
        )}

        {/* Part C Content */}
        {activePart === 'C' && (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-amber-900 mb-2">Part C - Earthworks</h2>
                  <p className="text-sm text-amber-700">
                    Site preparation, clearing, excavation, embankment, and earthwork activities
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-white rounded-lg border border-amber-100 p-4">
                    <div className="text-xs font-medium text-amber-600">Total Items</div>
                    <div className="text-2xl font-semibold text-amber-900 mt-1">{totalEarthworkItems}</div>
                    <div className="text-xs text-amber-700 mt-1">Across all earthworks categories</div>
                  </div>
                  <div className="bg-white rounded-lg border border-amber-100 p-4">
                    <div className="text-xs font-medium text-amber-600">Total Quantity</div>
                    <div className="text-2xl font-semibold text-amber-900 mt-1">
                      {totalEarthworkItems > 0 ? totalEarthworkQty.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}
                    </div>
                    <div className="text-xs text-amber-700 mt-1">
                      {totalEarthworkUnitLabel || 'No unit'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-amber-100 p-4">
                    <div className="text-xs font-medium text-amber-600">Categories Active</div>
                    <div className="text-2xl font-semibold text-amber-900 mt-1">
                      {earthworksCategories.filter(cat => summarizeCategory(cat.id).count > 0).length}
                    </div>
                    <div className="text-xs text-amber-700 mt-1">With at least one item</div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {earthworksCategories.map(category => {
                    const summary = summarizeCategory(category.id);
                    return (
                      <div key={category.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{category.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                          </div>
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            {summary.count} item{summary.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-gray-700">
                          Total qty: {summary.count > 0
                            ? `${summary.qty.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${summary.unitLabel}`
                            : '0'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Recent Earthworks Items</div>
                  {recentEarthworkItems.length === 0 ? (
                    <div className="text-sm text-gray-500">No earthworks items saved yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {recentEarthworkItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div className="text-gray-800">
                            <span className="font-medium">{item.dpwhItemNumberRaw}</span>
                            <span className="text-gray-500"> — {item.descriptionOverride || item.dpwhItemNumberRaw}</span>
                          </div>
                          <div className="text-gray-600">
                            {item.qty.toLocaleString('en-US', { maximumFractionDigits: 2 })} {item.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'clearing' && (
              <EarthworkItems 
                projectId={projectId}
                category="clearing"
                title="Clearing & Grubbing"
                description="Site clearing and grubbing activities"
                filterKeywords={['clearing', 'grubbing', 'vegetation']}
              />
            )}
            {activeTab === 'excavation' && <ExcavationStations projectId={projectId} />}
            {activeTab === 'structure-excavation' && <StructureExcavation projectId={projectId} />}
            {activeTab === 'embankment' && <EmbankmentItems projectId={projectId} />}
          </>
        )}

        {/* Part F Content */}
        {activePart === 'F' && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Part F - Electrical</h2>
            <p className="text-gray-600 mb-4">
              Electrical estimation features are coming soon
            </p>
            <p className="text-sm text-gray-500">
              This will include lighting, power distribution, conduits, wiring, and electrical fixtures
            </p>
          </div>
        )}

        {/* Part G Content */}
        {activePart === 'G' && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Part G - Mechanical</h2>
            <p className="text-gray-600 mb-4">
              Mechanical estimation features are coming soon
            </p>
            <p className="text-sm text-gray-500">
              This will include HVAC, plumbing, fire protection, and mechanical systems
            </p>
          </div>
        )}

        {/* Reports Content */}
        {activeTab === 'takeoff' && <TakeoffViewer projectId={projectId} />}
        {activeTab === 'boq' && <BOQViewer projectId={projectId} takeoffLines={[]} />}
        {activeTab === 'versions' && (
          <div className="bg-white rounded-lg p-6">
            <CalcRunList projectId={projectId} />
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
