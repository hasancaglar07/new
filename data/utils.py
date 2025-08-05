import streamlit as st
import os

def check_authentication():
    """Kullanıcının giriş yapıp yapmadığını kontrol eder."""
    return "authenticated" in st.session_state and st.session_state.authenticated

def show_password_popup():
    """Streamlit widget'ları ile şifre popup'ı gösterir."""
    
    # Zaten giriş yaptıysa, hiçbir şey gösterme
    if check_authentication():
        return

    # Arka plan karanlığı
    st.markdown("""
    <div style="
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: 'Poppins', sans-serif;
    ">
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            width: 90%;
            max-width: 400px;
            text-align: center;
        ">
    """, unsafe_allow_html=True)

    st.markdown("### 🔐 Erişim İçin Şifre Gerekli")
    st.markdown("<p style='color: #64748b; margin-bottom: 20px;'>Bu içeriğe erişim şifre ile sınırlıdır.</p>", unsafe_allow_html=True)

    with st.form(key="password_form"):
        password = st.text_input("Şifre", type="password", placeholder="Şifrenizi girin")
        submit = st.form_submit_button("Giriş Yap")

        if submit:
            correct_password = os.getenv("APP_PASSWORD", "yediulya")
            if password == correct_password:
                st.session_state.authenticated = True
                st.rerun()
            else:
                st.error("❌ Geçersiz şifre!")

    st.markdown("""
        </div>
    </div>
    """, unsafe_allow_html=True)