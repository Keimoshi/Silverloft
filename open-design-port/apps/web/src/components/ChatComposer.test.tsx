import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatComposer } from './ChatComposer';
import type { SkillSummary } from '../types';

function skill(overrides: Partial<SkillSummary>): SkillSummary {
  return {
    id: 'skill-a',
    name: '页面原型',
    description: 'Build a prototype',
    triggers: [],
    mode: 'prototype',
    previewType: 'html',
    designSystemRequired: false,
    defaultFor: [],
    upstream: null,
    hasBody: true,
    examplePrompt: '',
    ...overrides,
  };
}

describe('ChatComposer skill selector', () => {
  it('renders a visible skill binding selector with clear and skill options', () => {
    const markup = renderToStaticMarkup(
      <ChatComposer
        projectId="project-1"
        projectFiles={[]}
        streaming={false}
        onEnsureProject={async () => 'project-1'}
        onSend={() => {}}
        onStop={() => {}}
        skills={[
          skill({ id: 'prototype', name: '页面原型' }),
          skill({ id: 'deck', name: '演示文稿', mode: 'deck' }),
        ]}
        initialSkillId="deck"
        onBindSkill={() => {}}
      />,
    );

    expect(markup).toContain('data-testid="chat-skill-select"');
    expect(markup).toContain('技能');
    expect(markup).toContain('不绑定技能');
    expect(markup).toContain('页面原型');
    expect(markup).toContain('演示文稿');
    expect(markup).toContain('value="deck"');
  });
});
