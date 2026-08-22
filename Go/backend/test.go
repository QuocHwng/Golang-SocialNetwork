
package main

import (
	"fmt"
	"log"
	"social-network/internal/pkg/database"
	"social-network/internal/module/user"
)

func main() {
	database.ConnectDB()
	err := database.DB.AutoMigrate(&user.BlockedUser{})
	if err != nil {
		log.Fatalf("AutoMigrate error: %v", err)
	}
	fmt.Println("AutoMigrate OK")
}

