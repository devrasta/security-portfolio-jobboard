import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordStrengthMeter from '../PasswordStrengthMeter.vue'

describe('PasswordStrengthMeter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ strength: 3 }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
  })

  it('reste masqué quand le mot de passe est vide', () => {
    const wrapper = mount(PasswordStrengthMeter, { props: { password: '' } })
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it("affiche la force renvoyée par l'API après le debounce", async () => {
    const wrapper = mount(PasswordStrengthMeter, { props: { password: '' } })
    await wrapper.setProps({ password: 'Sup3rSecret!' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Bon'), { timeout: 2000 })
  })
})
