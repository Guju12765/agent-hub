import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Agent Hub',
  description: 'Your AI Agent Command Center',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  // TODO: Add og-image.png for social sharing

  themeConfig: {
    logo: {
      light: '/logo.svg',
      dark: '/logo-dark.svg'
    },

    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'Commands', link: '/commands/' },
      { text: 'Config', link: '/configuration/identity' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Agent Hub?', link: '/what-is-agent-hub' },
        ]
      },
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/' },
          { text: 'Create Your First Agent', link: '/getting-started/first-agent' },
          { text: 'Deploy to Projects', link: '/getting-started/hire-fire' },
        ]
      },
      {
        text: 'Commands',
        items: [
          { text: 'CLI Reference', link: '/commands/' },
        ]
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Architecture', link: '/concepts/architecture' },
          { text: 'Memory System', link: '/concepts/memory' },
          { text: 'Continuous Learning', link: '/concepts/continuous-learning' },
          { text: 'Target Platforms', link: '/concepts/targets' },
        ]
      },
      {
        text: 'Configuration',
        items: [
          { text: 'Identity', link: '/configuration/identity' },
          { text: 'Skills', link: '/configuration/skills' },
          { text: 'Rules', link: '/configuration/rules' },
          { text: 'Subagents', link: '/configuration/agents' },
          { text: 'Hooks', link: '/configuration/hooks' },
          { text: 'MCP Servers', link: '/configuration/mcp-servers' },
          { text: 'Plugins', link: '/configuration/plugins' },
          { text: 'Embeddings', link: '/configuration/embeddings' },
        ]
      },
      {
        text: 'Sharing',
        items: [
          { text: 'Export & Import', link: '/sharing/' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/anthropics/agent-hub' }
    ],

    search: {
      provider: 'local'
    },

    footer: {
      message: 'Built with VitePress',
    }
  }
})
