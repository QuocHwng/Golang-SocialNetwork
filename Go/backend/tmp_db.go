
package main

import (
	"fmt"
	"log"
	"social-network/internal/database"
	"social-network/internal/module/user"
)

func main() {
	database.ConnectDB()
	err := database.DB.AutoMigrate(&user.BlockedUser{})
	if err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}
	fmt.Println("AutoMigrate completed.")
}

