/*
 * Cliente publico de Supabase para Camweb.
 * La Publishable key esta pensada para usarse en el navegador; el acceso a
 * los datos sigue protegido por autenticacion y Row Level Security.
 */
(function () {
    const supabaseUrl = "https://mhjxdjduwodgjnnrrwih.supabase.co";
    const publishableKey = "sb_publishable_SeeTHmtOX9LZ2PiqrKL3Ww_fvPLBO8O";
    const administratorAuthEmail = "camweb529@gmail.com";

    if (!window.supabase?.createClient) {
        console.error("No se pudo cargar la libreria de Supabase.");
        return;
    }

    window.camwebSupabase = window.supabase.createClient(
        supabaseUrl,
        publishableKey,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
    window.camwebAdministratorAuthEmail = administratorAuthEmail;
})();
