<script>
    import { goto } from '$app/navigation';
    import { El, Divider } from 'yesvelte';
  </script>

<El container m="0" p="4">
  <El row tag="h1">About (툴 이름)</El>
  <Divider/>

  <El row tag="h1">*️⃣ CDM 데이터 뽑는 법</El>
  <img src="/about/1.png" alt="input page" style="width: 85%; height: auto; margin-top: 45px;" />
  <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 5px;">
    1️⃣ Click the 'Choose File' button to select CDM data in a .txt file with TSV format. If an error message appears, please check whether the selected file matches the required format.
  </El>
  
  <img src="/about/2.png" alt="input page" style="width: 85%; height: auto; margin-top: 45px;" />
  <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 5px;">
    2️⃣ When you select a file, the name of the chosen file will appear in the input field. <br />
    3️⃣ If the file has been correctly selected, press the Upload button. Please wait, as you will be automatically redirected to the results page after clicking the button.
  </El>
  
  <img src="/about/3.png" alt="input page" style="width: 85%; height: auto; margin-top: 5px;" />
  <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
    4️⃣ When the results page appears, select the patient whose chart you want to view from the list on the left.
  </El>
  
  <img src="/about/4.png" alt="input page" style="width: 85%; height: auto; margin-top: 5px;" />
  <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
    5️⃣ The Naranjo Algorithm is a survey tool that can verify whether ICI medications affect hepatotoxicity. It is a tool that confirms causality through 10 questions. Check the boxes that correspond to your answers to the questions.<br />
    6️⃣ Click the 'Export This Data' button to download the currently selected patient's chart and Naranjo Algorithm survey results as an .html file. If an error message appears, please check whether a patient has been selected.<br />
    7️⃣ Click the 'Export All Data' button to download charts and Naranjo Algorithm survey results for all patients as a zip file.
  </El>
  
  <img src="/about/5.png" alt="input page" style="width: 85%; height: auto; margin-top: 5px;"/>
  <El row tag="p" style="font-size: 16px; font-weight: 400; color: #333; margin-top: 45px;">
    8️⃣ The score below the Naranjo survey changes according to your responses among 'Yes,' 'No,' or 'Do not know or not done.<br />
    9️⃣ When you click the Submit button, your responses will be saved in local storage and will be included in the results when downloaded.<br />
    🔟 The chart has horizontal and vertical axes, and semi-transparent axes are generated when you scroll down or move sideways on the screen.
  </El>
</El>