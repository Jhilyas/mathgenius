// ── Supabase Configuration ──
const SUPABASE_URL = 'https://tpfkdpywbvttfcyvtcam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZmtkcHl3YnZ0dGZjeXZ0Y2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MzkxNDgsImV4cCI6MjA4OTQxNTE0OH0._ctZD4BSyTEY3fyZa-ezS8S1zFYSL-fj8mjuBnCFtwA';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Session ID — unique per browser/device, persists in localStorage
function getSessionId() {
  let sid = localStorage.getItem('mathgenius_session_id');
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : 'ses_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('mathgenius_session_id', sid);
  }
  return sid;
}

const SESSION_ID = getSessionId();

// ── Supabase Storage Helpers ──
const SupabaseStorage = {
  // Calculator History
  async saveCalcEntry(expr, result) {
    try {
      await supabase.from('calc_history').insert({
        session_id: SESSION_ID,
        expression: expr,
        result: result
      });
    } catch (e) { console.warn('Supabase calc save failed:', e); }
  },

  async loadCalcHistory() {
    try {
      const { data, error } = await supabase
        .from('calc_history')
        .select('expression, result, created_at')
        .eq('session_id', SESSION_ID)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map(r => ({ expr: r.expression, result: r.result, time: new Date(r.created_at).getTime() }));
    } catch (e) {
      console.warn('Supabase calc load failed, using localStorage:', e);
      return null; // fallback
    }
  },

  async clearCalcHistory() {
    try {
      await supabase.from('calc_history').delete().eq('session_id', SESSION_ID);
    } catch (e) { console.warn('Supabase calc clear failed:', e); }
  },

  // Chat History
  async saveChatMessage(role, content) {
    try {
      await supabase.from('chat_history').insert({
        session_id: SESSION_ID,
        role: role,
        content: content
      });
    } catch (e) { console.warn('Supabase chat save failed:', e); }
  },

  async loadChatHistory() {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('role, content, created_at')
        .eq('session_id', SESSION_ID)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data || []).map(r => ({ role: r.role, content: r.content }));
    } catch (e) {
      console.warn('Supabase chat load failed, using localStorage:', e);
      return null; // fallback
    }
  },

  async clearChatHistory() {
    try {
      await supabase.from('chat_history').delete().eq('session_id', SESSION_ID);
    } catch (e) { console.warn('Supabase chat clear failed:', e); }
  }
};
