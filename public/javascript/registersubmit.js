// registersubmit.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.registration-form');
    if (!form) return;
  
    // create message element
    const msg = document.createElement('p');
    msg.id = 'reg-form-message';
    msg.setAttribute('role', 'status');
    msg.style.marginTop = '10px';
    form.appendChild(msg);
  
    // robust selectors with fallbacks
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
  
    // primary skill: try several fallbacks (your HTML currently has id with a space)
    const primarySkillInput =
      document.getElementById('primary-skill') ||
      document.getElementById('primary skill') ||
      document.querySelector('input[placeholder*="Primary Skill"]') ||
      document.querySelector('input[placeholder*="primary skill"]') ||
      null;
  
    const cityInput = document.getElementById('city');
    const experienceInput = document.getElementById('experience');
    const termsCheckbox = document.getElementById('agree-terms');
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
  
    function showMessage(text, isError = false) {
      msg.textContent = text;
      msg.style.color = isError ? 'crimson' : 'green';
    }
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage('');
  
      // collect values
      const name = (nameInput?.value || '').trim();
      const email = (emailInput?.value || '').trim();
      const phone = (phoneInput?.value || '').trim();
      const contact = phone || email || ''; // prefer phone then email
      const primarySkill = (primarySkillInput?.value || '').trim();
      const city = (cityInput?.value || '').trim();
      const experienceRaw = (experienceInput?.value || '').trim();
      const experience = experienceRaw === '' ? 0 : Number(experienceRaw);
      const agreed = !!(termsCheckbox && termsCheckbox.checked);
  
      // basic client-side validation
      if (!name) return showMessage('Please enter your full name.', true);
      if (!contact) return showMessage('Please enter phone or email as contact.', true);
      if (!primarySkill) return showMessage('Please enter at least one primary skill.', true);
      if (!city) return showMessage('Please enter your city.', true);
      if (!Number.isFinite(experience) || experience < 0) return showMessage('Please enter a valid experience (years).', true);
      if (!agreed) return showMessage('You must agree to the Terms of Service & Privacy Policy.', true);
  
      const payload = {
        name,
        contact,
        city,
        skills: primarySkill, // server accepts comma-separated string or array
        experience,
        ratings: 0,
        distance: 0
      };
  
      // disable submit while working
      if (submitBtn) submitBtn.disabled = true;
      showMessage('Registering...');
  
      try {
        const res = await fetch('/api/workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
  
        // try parse JSON
        const data = await res.json().catch(() => ({}));
  
        if (res.status === 201) {
            showMessage('Registered successfully!', false);
            form.reset();
            return;
           
        }
        // handle common errors
        if (res.status === 409) {
          showMessage(data.message || 'Contact already exists.', true);
        } else if (res.status === 422) {
          // validation errors from express-validator
          if (data.errors && Array.isArray(data.errors)) {
            const msgText = data.errors.map(e => e.msg).join('; ');
            showMessage(msgText || 'Validation failed.', true);
          } else {
            showMessage(data.message || 'Validation failed.', true);
          }
        } else {
          showMessage(data.message || 'Registration failed. Try again.', true);
        }
      } catch (err) {
        console.error('Registration error:', err);
        showMessage('Unexpected error. Check console.', true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
  