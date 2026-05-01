// BAD CODE FOR TESTING AI REVIEW

function getUserData(user) {
    if(user == null){
        console.log("User not found")
    }

    let password = "123456"; // hardcoded password (security issue

    if(user.age < 18){
        return "minor"
    } else {
        return "adult"
    }
}

getUserData();