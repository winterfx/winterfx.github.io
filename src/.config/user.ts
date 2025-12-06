import type { UserConfig } from '~/types'

export const userConfig: Partial<UserConfig> = {
  site: {
    title: '冬天的世界',
    subtitle: 'Personal Website',
    author: '',
    description: '软件工程师，热爱编程、开源和技术分享',
    website: 'https://blog.winterio.com.cn',
    navLinks: [
      {
        name: 'Home',
        href: '/',
      },
      {
        name: 'Posts',
        href: '/posts',
      },
      {
        name: 'Projects',
        href: '/projects',
      },
      {
        name: 'Podcasts',
        href: '/podcasts',
      },
      {
        name: 'Resume',
        href: '/resume',
      },
    ],
    socialLinks: [
      {
        name: 'github',
        href: 'https://github.com/winterfx',
      },
      {
        name: 'x',
        href: 'https://x.com/wenhuiwang10',
      },
      {
        name: 'rss',
        href: '/atom.xml',
      },
    ],
  },
}
