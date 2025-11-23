import React, { useState } from 'react';
import {
  Save, Copy, Download, Upload, Play, Pause, Settings,
  TrendingUp, TrendingDown, Zap, Target, Brain, Edit
} from 'lucide-react';
import {
  STRATEGY_TEMPLATES,
  StrategyTemplate,
  TEMPLATE_CATEGORIES,
  cloneTemplate
} from '../../config/strategyTemplates';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

export const StrategyTemplateEditor: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate>(STRATEGY_TEMPLATES.trendFollowing);
  const [editedTemplate, setEditedTemplate] = useState<StrategyTemplate>(selectedTemplate);
  const [isEditing, setIsEditing] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<StrategyTemplate[]>([]);

  const handleTemplateSelect = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate(template);
    setIsEditing(false);
  };

  const handleParameterChange = (paramKey: string, value: string | number | boolean) => {
    setEditedTemplate({
      ...editedTemplate,
      parameters: {
        ...editedTemplate.parameters,
        [paramKey]: {
          ...editedTemplate.parameters[paramKey],
          value
        }
      }
    });
    setIsEditing(true);
  };

  const handleRiskManagementChange = (key: string, value: number) => {
    setEditedTemplate({
      ...editedTemplate,
      riskManagement: {
        ...editedTemplate.riskManagement,
        [key]: value
      }
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const customTemplate = cloneTemplate(selectedTemplate, editedTemplate);
    setSavedTemplates([...savedTemplates, customTemplate]);
    localStorage.setItem('custom-strategies', JSON.stringify([...savedTemplates, customTemplate]));
    setIsEditing(false);
    showToast('success', 'Strategy Saved', `Strategy "${customTemplate.name}" saved successfully!`);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(editedTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `strategy-${editedTemplate.id}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleReset = async () => {
    const confirmed = await confirm('Reset Parameters', 'Reset all parameters to default values?', 'warning');
    if (confirmed) {
      setEditedTemplate(selectedTemplate);
      setIsEditing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trend': return <TrendingUp className="w-5 h-5" />;
      case 'reversal': return <TrendingDown className="w-5 h-5" />;
      case 'breakout': return <Zap className="w-5 h-5" />;
      case 'scalping': return <Target className="w-5 h-5" />;
      case 'custom': return <Brain className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trend': return { bg: 'from-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', glow: '59, 130, 246' };
      case 'reversal': return { bg: 'from-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400', glow: '168, 85, 247' };
      case 'breakout': return { bg: 'from-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: '16, 185, 129' };
      case 'scalping': return { bg: 'from-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', glow: '251, 191, 36' };
      case 'custom': return { bg: 'from-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-400', glow: '236, 72, 153' };
      default: return { bg: 'from-slate-500/20', border: 'border-slate-500/40', text: 'text-slate-400', glow: '100, 116, 139' };
    }
  };

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen p-8">
        <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-shimmer {
          animation: shimmer 8s infinite linear;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
          background-size: 1000px 100%;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent"
          style={{ textShadow: '0 0 30px rgba(236, 72, 153, 0.4)' }}
        >
          Strategy Templates
        </h1>
        <p className="text-slate-400 text-base">
          Choose a template, customize parameters, and deploy your trading strategy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl p-6 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(236, 72, 153, 0.15)'
            }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Available Templates</h3>
            
            <div className="space-y-3">
              {Object.values(STRATEGY_TEMPLATES).map((template) => {
                const colors = getCategoryColor(template.category);
                const isSelected = selectedTemplate.id === template.id;
                
                return (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full p-4 rounded-xl transition-all duration-300 ${
                      isSelected ? 'scale-105' : 'hover:scale-102'
                    }`}
                    style={{
                      background: isSelected 
                        ? `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.03) 100%)`
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: isSelected ? `0 8px 32px rgba(${colors.glow}, 0.3)` : 'none'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                        {getCategoryIcon(template.category)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-semibold ${isSelected ? colors.text : 'text-white'} mb-1`}>
                          {template.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {template.description}
                        </div>
                        <div className={`text-[10px] ${colors.text} mt-2`}>
                          {template.category.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved Templates */}
          {(savedTemplates?.length || 0) > 0 && (
            <div className="rounded-2xl p-6 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
              }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Saved Strategies</h3>
              <div className="space-y-2">
                {(savedTemplates || []).map((template, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="font-semibold text-emerald-400 text-sm">{template.name}</div>
                    <div className="text-xs text-slate-500">{new Date(parseInt(template.id.split('-').pop() || '0')).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actions */}
          <div className="rounded-2xl p-4 backdrop-blur-sm flex items-center justify-between gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isEditing}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!isEditing}
                className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
            
            {isEditing && (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <Edit className="w-4 h-4" />
                Unsaved changes
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="rounded-2xl p-6 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15)'
            }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Strategy Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(editedTemplate.parameters).map(([key, param]) => (
                <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <label className="text-sm font-semibold text-white mb-2 block capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <p className="text-xs text-slate-400 mb-3">{param.description}</p>
                  
                  {typeof param.value === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => handleParameterChange(key, !param.value)}
                      className={`w-full py-2 rounded-lg font-semibold transition-all ${
                        param.value 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/40'
                      }`}
                    >
                      {param.value ? 'Enabled' : 'Disabled'}
                    </button>
                  ) : param.options ? (
                    <select
                      value={param.value as string}
                      onChange={(e) => handleParameterChange(key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    >
                      {(param.options || []).map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="range"
                        min={param.min || 0}
                        max={param.max || 100}
                        step={param.step || 1}
                        value={param.value as number}
                        onChange={(e) => handleParameterChange(key, parseFloat(e.target.value))}
                        className="w-full mb-2"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Min: {param.min}</span>
                        <span className="text-lg font-bold text-purple-400">{param.value}</span>
                        <span className="text-xs text-slate-500">Max: {param.max}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Management */}
          <div className="rounded-2xl p-6 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(239, 68, 68, 0.15)'
            }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Risk Management</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(editedTemplate.riskManagement).map(([key, value]) => (
                <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <label className="text-sm font-semibold text-white mb-2 block capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={value}
                    onChange={(e) => handleRiskManagementChange(key, parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-lg"
                  />
                  <p className="text-xs text-slate-400 mt-1">%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entry Conditions */}
            <div className="rounded-2xl p-6 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
              }}
            >
              <h3 className="text-lg font-bold text-emerald-400 mb-4">Entry Conditions</h3>
              <ul className="space-y-2">
                {(editedTemplate.conditions.entry || []).map((condition, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Exit Conditions */}
            <div className="rounded-2xl p-6 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
              }}
            >
              <h3 className="text-lg font-bold text-rose-400 mb-4">Exit Conditions</h3>
              <ul className="space-y-2">
                {(editedTemplate.conditions.exit || []).map((condition, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-rose-400 mt-1">×</span>
                    <span>{condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
