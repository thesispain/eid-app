# Supabase Setup Guide

Follow these steps to set up your backend for the Eid Card App:

1. **Create an Account & Project**
   - Go to [supabase.com](https://supabase.com/) and create a free account.
   - Click "New Project", select your organization, give it a name like "Eid App", and set a secure database password. Click "Create new project".
   - Wait a few minutes for the database to provision.

2. **Get Your API Credentials**
   - In your Supabase dashboard, go to **Project Settings** (the gear icon on the left sidebar).
   - Click on **API** in the left menu.
   - Here you will find your **Project URL** and your **anon/public Key**.
   - Copy these two values.
   - Open your project folder, create a file named `config.js` (you can copy the provided `config.template.js`), and paste the URL and Key into it like this:
     ```javascript
     const CONFIG = {
         SUPABASE_URL: 'https://your-project-url.supabase.co',
         SUPABASE_ANON_KEY: 'your-long-anon-key-string...',
         EID_DATE: '2024-04-10T00:00:00Z' // Change this to your target date
     };
     ```

3. **Run the Database Schema Script**
   - On the left sidebar of your Supabase dashboard, click on **SQL Editor** (the terminal icon).
   - Click "New Query".
   - Open the `schema.sql` file that I created for you in your project folder, copy all of its contents, and paste it into the SQL Editor.
   - Click the "Run" button (or press Cmd/Ctrl + Enter).
   - This will instantly create all your tables (`users`, `questions`, etc.), set up security rules, and insert the dummy data.

4. **Enable Realtime for the Admin Toggle (Crucial for Person 2)**
   - On the left sidebar, click on **Database** (the database icon).
   - Click on **Replication** in the menu.
   - Under "Supabase Realtime", click the button to control which tables broadcast changes.
   - Toggle the switch ON for the `secret_admin_data` table. This allows the frontend to instantly unblur the timeline when you change the value in the database.

That's it! Your backend is now fully connected and secure. 

To test it, open `index.html` in your browser. Since `config.js` is now set up, it will talk to your real Supabase database instead of using the local Dev Mode.
