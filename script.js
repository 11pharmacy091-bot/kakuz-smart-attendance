// ======================================
// KAKUZ SMART ATTENDANCE SYSTEM
// FIREBASE CONFIGURATION
// ======================================

const firebaseConfig = {
apiKey: "AIzaSyClUAAoxLasyEwQurvPwwSRlDN-VfpMXXs",
authDomain: "kakuz-smart-attendance.firebaseapp.com",
projectId: "kakuz-smart-attendance",
storageBucket: "kakuz-smart-attendance.firebasestorage.app",
messagingSenderId: "721806416285",
appId: "1:721806416285:web:19b054697332180b6cb774",
measurementId: "G-MJZ76Y0RK7"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentProfile = null;
let qrScanner = null;

// ======================================
// NAVIGATION
// ======================================

function showLogin() {
document.getElementById("registration").hidden = true;

document.getElementById("login").scrollIntoView({
    behavior: "smooth"
});

}

function showRegistration() {
hideDashboards();

document.getElementById("registration").hidden = false;

document.getElementById("registration").scrollIntoView({
    behavior: "smooth"
});

}

function hideDashboards() {
document.getElementById("student-dashboard").hidden = true;
document.getElementById("lecturer-dashboard").hidden = true;
document.getElementById("admin-dashboard").hidden = true;
document.getElementById("registration").hidden = true;
}

// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(value) {
return String(value || "").replace(/[&<>"']/g, function(char) {
return {
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
}[char];
});
}

// ======================================
// SHOW STUDENT DASHBOARD
// ======================================

function showStudentDashboard(profile) {
hideDashboards();

const dashboard = document.getElementById("student-dashboard");

dashboard.hidden = false;

document.getElementById("student-name").value =
    profile.fullName || "";

document.getElementById("matric-number").value =
    profile.userID || "";

dashboard.scrollIntoView({
    behavior: "smooth"
});

}

// ======================================
// SHOW LECTURER DASHBOARD
// ======================================

function showLecturerDashboard(profile) {
hideDashboards();

const dashboard = document.getElementById("lecturer-dashboard");

dashboard.hidden = false;

dashboard.scrollIntoView({
    behavior: "smooth"
});

}

// ======================================
// STUDENT LOGIN
// ======================================

async function studentLogin() {
const email = document.getElementById("student-login-id").value.trim();
const password = document.getElementById("student-login-password").value;

if (!email || !password) {
    alert("Enter your registered email and password.");
    return;
}

try {
    const credential = await auth.signInWithEmailAndPassword(email, password);

    const user = credential.user;

    const snapshot = await db.collection("users")
        .doc(user.uid)
        .get();

    if (!snapshot.exists) {
        await auth.signOut();
        alert("Student profile not found.");
        return;
    }

    const profile = snapshot.data();

    if (profile.accountType !== "student") {
        await auth.signOut();
        alert("This account is not registered as a student.");
        return;
    }

    currentUser = user;
    currentProfile = profile;

    showStudentDashboard(profile);

} catch (error) {
    alert("Student login failed: " + error.message);
}

}

// ======================================
// LECTURER LOGIN
// ======================================

async function lecturerLogin() {
const email = document.getElementById("lecturer-login-email").value.trim();
const password = document.getElementById("lecturer-login-password").value;

if (!email || !password) {
    alert("Enter lecturer email and password.");
    return;
}

try {
    const credential = await auth.signInWithEmailAndPassword(email, password);

    const snapshot = await db.collection("users")
        .doc(credential.user.uid)
        .get();

    if (!snapshot.exists) {
        await auth.signOut();
        alert("Lecturer profile not found.");
        return;
    }

    const profile = snapshot.data();

    if (profile.accountType !== "lecturer") {
        await auth.signOut();
        alert("This account is not registered as a lecturer.");
        return;
    }

    if (profile.approved !== true) {
        await auth.signOut();
        alert("Your account is waiting for administrator approval.");
        return;
    }

    currentUser = credential.user;
    currentProfile = profile;

    showLecturerDashboard(profile);

} catch (error) {
    alert("Lecturer login failed: " + error.message);
}

}

// ======================================
// ADMIN LOGIN
// ======================================

async function adminLogin() {
const email = document.getElementById("admin-email").value.trim();
const password = document.getElementById("admin-password").value;

if (!email || !password) {
    alert("Enter admin email and password.");
    return;
}

try {
    const credential = await auth.signInWithEmailAndPassword(email, password);

    const user = credential.user;

    const adminDoc = await db.collection("admins")
        .doc(user.uid)
        .get();

    if (!adminDoc.exists || adminDoc.data().role !== "admin") {
        await auth.signOut();
        alert("Access denied. Administrator account required.");
        return;
    }

    currentUser = user;
    currentProfile = adminDoc.data();

    hideDashboards();

    document.getElementById("admin-dashboard").hidden = false;

    document.getElementById("admin-dashboard").scrollIntoView({
        behavior: "smooth"
    });

    await loadAdminStatistics();

} catch (error) {
    alert("Admin login failed: " + error.message);
}

}

// ======================================
// ACCOUNT REGISTRATION
// ======================================

async function registerAccount() {
const accountType = document.getElementById("account-type").value;
const fullName = document.getElementById("register-name").value.trim();
const userID = document.getElementById("register-id").value.trim();
const email = document.getElementById("register-email").value.trim();
const department = document.getElementById("register-department").value.trim();
const level = document.getElementById("register-level").value.trim();
const password = document.getElementById("register-password").value;
const confirmPassword = document.getElementById("confirm-password").value;

const message = document.getElementById("register-message");

if (!fullName || !userID || !email || !department || !password || !confirmPassword) {
    message.textContent = "Complete all required fields.";
    return;
}

if (accountType === "student" && !level) {
    message.textContent = "Enter your academic level.";
    return;
}

if (password.length < 6) {
    message.textContent = "Password must contain at least 6 characters.";
    return;
}

if (password !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
}

try {
    message.textContent = "Creating your account...";

    const credential = await auth.createUserWithEmailAndPassword(
        email,
        password
    );

    const user = credential.user;

    await db.collection("users").doc(user.uid).set({
        fullName: fullName,
        userID: userID,
        email: email,
        department: department,
        level: accountType === "student" ? level : "",
        accountType: accountType,
        approved: accountType === "student",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await auth.signOut();

    message.textContent = accountType === "lecturer"
        ? "Registration successful! Wait for administrator approval."
        : "Registration successful! You can now log in.";

} catch (error) {
    message.textContent = "Registration failed: " + error.message;
}

}

// ======================================
// GENERATE ATTENDANCE QR CODE
// ======================================

async function generateQR() {
if (
!currentUser ||
!currentProfile ||
currentProfile.accountType !== "lecturer" ||
currentProfile.approved !== true
) {
alert("Approved lecturer login required.");
return;
}

const course = document.getElementById("course-name").value.trim();
const qrContainer = document.getElementById("qr-code");

if (!course) {
    alert("Enter course name.");
    return;
}

try {
    qrContainer.innerHTML = "Generating QR code...";

    const sessionRef = await db.collection("attendanceSessions").add({
        course: course,
        lecturerId: currentUser.uid,
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const attendanceCode = {
        sessionId: sessionRef.id,
        course: course
    };

    qrContainer.innerHTML = "";

    new QRCode(qrContainer, {
        text: JSON.stringify(attendanceCode),
        width: 200,
        height: 200
    });

} catch (error) {
    qrContainer.textContent = error.message;
}

}

// ======================================
// START QR SCANNER
// ======================================

async function startAttendance() {
if (
!currentUser ||
!currentProfile ||
currentProfile.accountType !== "student"
) {
alert("Student login required.");
return;
}

const result = document.getElementById("scan-result");

try {
    if (qrScanner && qrScanner.isScanning) {
        return;
    }

    if (!qrScanner) {
        qrScanner = new Html5Qrcode("qr-reader");
    }

    result.textContent = "Opening camera...";

    await qrScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: 250
        },
        async function(decodedText) {
            await recordAttendance(decodedText);
        },
        function() {}
    );

    result.textContent = "Scanner active. Scan your lecturer's QR code.";

} catch (error) {
    result.textContent = "Camera error: " + error.message;
}

}

// ======================================
// RECORD STUDENT ATTENDANCE
// ======================================

async function recordAttendance(decodedText) {
const result = document.getElementById("scan-result");

try {
    const attendance = JSON.parse(decodedText);

    if (!attendance.sessionId) {
        throw new Error("Invalid QR code.");
    }

    const sessionRef = db.collection("attendanceSessions")
        .doc(attendance.sessionId);

    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
        throw new Error("Attendance session does not exist.");
    }

    const session = sessionDoc.data();

    if (!session.active || session.course !== attendance.course) {
        throw new Error("This attendance session is no longer active.");
    }

    const recordRef = db.collection("attendanceRecords")
        .doc(attendance.sessionId + "_" + currentUser.uid);

    await db.runTransaction(async function(transaction) {
        const existing = await transaction.get(recordRef);

        if (existing.exists) {
            throw new Error("Attendance already recorded.");
        }

        transaction.set(recordRef, {
            studentName: currentProfile.fullName,
            matricNumber: currentProfile.userID,
            course: session.course,
            session: attendance.sessionId,
            lecturerId: session.lecturerId,
            studentId: currentUser.uid,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    result.textContent = "Attendance recorded successfully!";

    await stopAttendance();

} catch (error) {
    result.textContent = error.message;
}

}

// ======================================
// STOP QR SCANNER
// ======================================

async function stopAttendance() {
if (qrScanner && qrScanner.isScanning) {
await qrScanner.stop();

    document.getElementById("scan-result").textContent =
        "Scanner stopped.";
}

}

// ======================================
// VIEW LECTURER ATTENDANCE
// ======================================

async function viewAttendance() {
if (
!currentUser ||
!currentProfile ||
currentProfile.accountType !== "lecturer" ||
currentProfile.approved !== true
) {
alert("Lecturer login required.");
return;
}

const attendanceList = document.getElementById("attendance-list");
const totalStudents = document.getElementById("total-students");

attendanceList.innerHTML = "";
totalStudents.textContent = "Loading...";

try {
    const snapshot = await db.collection("attendanceRecords")
        .where("lecturerId", "==", currentUser.uid)
        .get();

    snapshot.forEach(function(doc) {
        const record = doc.data();

        const row = document.createElement("tr");

        const values = [
            record.studentName,
            record.matricNumber,
            record.course,
            record.date
                ? record.date.toDate().toLocaleString()
                : "Processing..."
        ];

        values.forEach(function(value) {
            const cell = document.createElement("td");
            cell.textContent = value || "";
            row.appendChild(cell);
        });

        attendanceList.appendChild(row);
    });

    totalStudents.textContent = snapshot.size;

} catch (error) {
    totalStudents.textContent = error.message;
}

}

// ======================================
// ADMIN STATISTICS
// ======================================

async function loadAdminStatistics() {
if (
!currentUser ||
!currentProfile ||
currentProfile.role !== "admin"
) {
return;
}

try {
    const students = await db.collection("users")
        .where("accountType", "==", "student")
        .get();

    const lecturers = await db.collection("users")
        .where("accountType", "==", "lecturer")
        .get();

    const attendance = await db.collection("attendanceRecords")
        .get();

    document.getElementById("admin-students").textContent = students.size;
    document.getElementById("admin-lecturers").textContent = lecturers.size;
    document.getElementById("admin-attendance").textContent = attendance.size;

} catch (error) {
    console.error("Statistics error:", error);
}

}

// ======================================
// LOAD PENDING LECTURERS
// ======================================

async function loadPendingLecturers() {
if (
!currentUser ||
!currentProfile ||
currentProfile.role !== "admin"
) {
alert("Administrator access required.");
return;
}

const container = document.getElementById("pending-lecturers");

container.textContent = "Loading lecturers...";

try {
    const snapshot = await db.collection("users")
        .where("accountType", "==", "lecturer")
        .where("approved", "==", false)
        .get();

    container.innerHTML = "";

    if (snapshot.empty) {
        container.textContent = "No pending lecturer approvals.";
        return;
    }

    snapshot.forEach(function(doc) {
        const lecturer = doc.data();

        const card = document.createElement("div");

        const name = document.createElement("p");
        name.textContent = "Name: " + lecturer.fullName;

        const email = document.createElement("p");
        email.textContent = "Email: " + lecturer.email;

        const staffID = document.createElement("p");
        staffID.textContent = "Staff ID: " + lecturer.userID;

        const button = document.createElement("button");
        button.textContent = "Approve Lecturer";

        button.onclick = function() {
            approveLecturer(doc.id);
        };

        card.append(name, email, staffID, button);
        container.appendChild(card);
    });

} catch (error) {
    container.textContent = error.message;
}

}

// ======================================
// APPROVE LECTURER
// ======================================

async function approveLecturer(uid) {
if (
!currentUser ||
!currentProfile ||
currentProfile.role !== "admin"
) {
alert("Administrator access required.");
return;
}

if (!confirm("Are you sure you want to approve this lecturer?")) {
    return;
}

try {
    await db.collection("users").doc(uid).update({
        approved: true
    });

    alert("Lecturer approved successfully!");

    await loadPendingLecturers();
    await loadAdminStatistics();

} catch (error) {
    alert("Approval failed: " + error.message);
}

}

// ======================================
// LOAD REGISTERED STUDENTS
// ======================================

async function loadStudents() {
if (
!currentUser ||
!currentProfile ||
currentProfile.role !== "admin"
) {
alert("Administrator access required.");
return;
}

const container = document.getElementById("admin-student-list");

container.textContent = "Loading students...";

try {
    const snapshot = await db.collection("users")
        .where("accountType", "==", "student")
        .get();

    container.innerHTML = "";

    if (snapshot.empty) {
        container.textContent = "No registered students found.";
        return;
    }

    snapshot.forEach(function(doc) {
        const student = doc.data();

        const card = document.createElement("div");

        const name = document.createElement("p");
        name.textContent = "Name: " + student.fullName;

        const matric = document.createElement("p");
        matric.textContent = "Matric Number: " + student.userID;

        const department = document.createElement("p");
        department.textContent = "Department: " + student.department;

        const level = document.createElement("p");
        level.textContent = "Level: " + student.level;

        card.append(name, matric, department, level);

        container.appendChild(card);
    });

} catch (error) {
    container.textContent = error.message;
}

}

// ======================================
// LOGOUT
// ======================================

async function logout() {
try {
await stopAttendance();

    await auth.signOut();

    currentUser = null;
    currentProfile = null;

    hideDashboards();
    showLogin();

    alert("Logged out successfully.");

} catch (error) {
    alert("Logout failed: " + error.message);
}

  }
