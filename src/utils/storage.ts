/**
 * 本应用专属的 localStorage 工具
 * 使用前缀避免与其他应用冲突
 */

const APP_PREFIX = 'subtitle_translator_'

export const storage = {
  /**
   * 获取存储的值
   */
  get(key: string): string | null {
    return localStorage.getItem(APP_PREFIX + key)
  },

  /**
   * 设置存储的值
   */
  set(key: string, value: string): void {
    localStorage.setItem(APP_PREFIX + key, value)
  },

  /**
   * 删除存储的值
   */
  remove(key: string): void {
    localStorage.removeItem(APP_PREFIX + key)
  },

  /**
   * 清除所有本应用的存储
   */
  clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(APP_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  }
}

// 导出常用的 key 名称，避免硬编码
export const STORAGE_KEYS = {
  API_KEY: 'api_key',
  CUSTOM_PROMPT: 'custom_prompt',
  PROPER_NOUNS: 'proper_nouns'
}

