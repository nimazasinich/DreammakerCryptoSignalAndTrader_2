import React from 'react';
import type { NewsArticle } from '../../services/enhanced/newsProvider';

export default function NewsCard(props: NewsArticle) {
  const { title, description, url, image, source, published } = props;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.08)'
      }}
      aria-label={title}
    >
      {image && (
        <div className="relative overflow-hidden h-40">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-white text-sm line-clamp-2 mb-2" style={{
          textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
        }}>
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-400 line-clamp-3 mb-3">
            {description}
          </p>
        )}
        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span className="text-purple-400">{source || 'News'}</span>
          {published && (
            <time dateTime={published}>
              {new Date(published).toLocaleDateString()}
            </time>
          )}
        </div>
      </div>
    </a>
  );
}
